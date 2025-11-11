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

    // Decrypted content (client-side only)
    var decryptedContent: String?

    enum CodingKeys: String, CodingKey {
        case id, threadId, senderId, ciphertext, iv, sourceLang, createdAt, sender
    }
}

struct CreateMessageRequest: Codable {
    let ciphertext: String
    let iv: String
    let sourceLang: String
}
