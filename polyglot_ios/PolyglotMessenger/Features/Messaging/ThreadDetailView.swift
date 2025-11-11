import SwiftUI

struct ThreadDetailView: View {
    @EnvironmentObject var messagingViewModel: MessagingViewModel
    let thread: Thread

    @State private var messageText = ""

    var body: some View {
        VStack(spacing: 0) {
            // Messages List
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(messagingViewModel.messages) { message in
                        MessageBubble(message: message)
                    }
                }
                .padding()
            }

            // Message Input
            HStack(spacing: 12) {
                TextField("Type a message...", text: $messageText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.blue)
                }
                .disabled(messageText.isEmpty)
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .navigationTitle(thread.participants.map { $0.user.name ?? $0.user.email }.joined(separator: ", "))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await messagingViewModel.selectThread(thread)
        }
    }

    private func sendMessage() {
        let content = messageText
        messageText = ""

        Task {
            await messagingViewModel.sendMessage(content: content, to: thread.id)
        }
    }
}

struct MessageBubble: View {
    let message: Message
    @EnvironmentObject var authViewModel: AuthViewModel

    var isFromCurrentUser: Bool {
        message.senderId == authViewModel.currentUser?.id
    }

    var body: some View {
        HStack {
            if isFromCurrentUser {
                Spacer()
            }

            VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 4) {
                Text(message.decryptedContent ?? "Decrypting...")
                    .padding(12)
                    .background(isFromCurrentUser ? Color.blue : Color.secondary.opacity(0.2))
                    .foregroundColor(isFromCurrentUser ? .white : .primary)
                    .cornerRadius(16)

                Text(message.createdAt, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            if !isFromCurrentUser {
                Spacer()
            }
        }
    }
}
