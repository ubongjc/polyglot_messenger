import Foundation

struct Message: Identifiable, Codable {
    let id: String
    let threadId: String
    let senderId: String
    let ciphertext: String
    let iv: String
    let sourceLang: String
    let createdAt: Date
    let sender: User

    // Disappearing messages
    let expiresAt: Date?
    let expiresInSeconds: Int?

    // One-time view
    let isOneTimeView: Bool
    let viewedAt: Date?

    // Voice messages
    let isVoiceMessage: Bool
    let originalAudioUrl: String?
    let audioDurationMs: Int?

    // Decrypted content (client-side only)
    var decryptedContent: String?

    // Computed properties
    var isExpired: Bool {
        if let expiresAt = expiresAt {
            return Date() > expiresAt
        }
        return false
    }

    var shouldHide: Bool {
        // Hide if expired or if one-time view was already seen
        return isExpired || (isOneTimeView && viewedAt != nil)
    }

    enum CodingKeys: String, CodingKey {
        case id, threadId, senderId, ciphertext, iv, sourceLang, createdAt, sender
        case expiresAt, expiresInSeconds
        case isOneTimeView, viewedAt
        case isVoiceMessage, originalAudioUrl, audioDurationMs
    }
}

struct CreateMessageRequest: Codable {
    let ciphertext: String
    let iv: String
    let sourceLang: String

    // Optional features
    let expiresInSeconds: Int?
    let isOneTimeView: Bool?
    let isVoiceMessage: Bool?
    let originalAudioUrl: String?
    let audioDurationMs: Int?

    init(
        ciphertext: String,
        iv: String,
        sourceLang: String = "en",
        expiresInSeconds: Int? = nil,
        isOneTimeView: Bool? = nil,
        isVoiceMessage: Bool? = nil,
        originalAudioUrl: String? = nil,
        audioDurationMs: Int? = nil
    ) {
        self.ciphertext = ciphertext
        self.iv = iv
        self.sourceLang = sourceLang
        self.expiresInSeconds = expiresInSeconds
        self.isOneTimeView = isOneTimeView
        self.isVoiceMessage = isVoiceMessage
        self.originalAudioUrl = originalAudioUrl
        self.audioDurationMs = audioDurationMs
    }
}
