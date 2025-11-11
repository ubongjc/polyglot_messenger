import Foundation
import CryptoKit

@MainActor
class MessagingViewModel: ObservableObject {
    @Published var threads: [Thread] = []
    @Published var currentThread: Thread?
    @Published var messages: [Message] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared
    private let cryptoManager = CryptoManager.shared
    private var encryptionKey: SymmetricKey?

    init() {
        // Load or generate encryption key
        loadEncryptionKey()
    }

    // MARK: - Key Management

    private func loadEncryptionKey() {
        // Try to load existing key from Keychain
        // For now, generate a new one (placeholder)
        encryptionKey = cryptoManager.generateKey()
    }

    // MARK: - Threads

    func fetchThreads() async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await apiClient.getThreads()
            threads = response.threads
        } catch {
            errorMessage = "Failed to load threads: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func selectThread(_ thread: Thread) async {
        currentThread = thread
        await fetchMessages(for: thread.id)
    }

    func createThread(with participantIds: [String]) async {
        isLoading = true
        errorMessage = nil

        do {
            let thread = try await apiClient.createThread(participantUserIds: participantIds)
            threads.insert(thread, at: 0)
            await selectThread(thread)
        } catch {
            errorMessage = "Failed to create thread: \(error.localizedDescription)"
        }

        isLoading = false
    }

    // MARK: - Messages

    func fetchMessages(for threadId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let thread = try await apiClient.getThread(id: threadId)

            // Decrypt messages
            var decryptedMessages = thread.messages ?? []
            for i in 0..<decryptedMessages.count {
                if let key = encryptionKey {
                    do {
                        let decrypted = try cryptoManager.decryptToString(
                            ciphertext: decryptedMessages[i].ciphertext,
                            iv: decryptedMessages[i].iv,
                            using: key
                        )
                        decryptedMessages[i].decryptedContent = decrypted
                    } catch {
                        print("Failed to decrypt message: \(error)")
                    }
                }
            }

            messages = decryptedMessages
            currentThread = thread

        } catch {
            errorMessage = "Failed to load messages: \(error.localizedDescription)"
        }

        isLoading = false
    }

    func sendMessage(content: String, to threadId: String) async {
        guard let key = encryptionKey else {
            errorMessage = "Encryption key not available"
            return
        }

        do {
            // Encrypt message
            let encrypted = try cryptoManager.encrypt(string: content, using: key)

            let request = CreateMessageRequest(
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                sourceLang: "en" // TODO: Detect language
            )

            var message = try await apiClient.sendMessage(threadId: threadId, message: request)
            message.decryptedContent = content

            messages.append(message)

        } catch {
            errorMessage = "Failed to send message: \(error.localizedDescription)"
        }
    }
}
