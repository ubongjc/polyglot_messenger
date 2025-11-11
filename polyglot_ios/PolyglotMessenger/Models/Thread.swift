import Foundation

struct Thread: Identifiable, Codable {
    let id: String
    let createdAt: Date
    let updatedAt: Date
    let participants: [ThreadParticipant]
    let messages: [Message]?

    enum CodingKeys: String, CodingKey {
        case id, createdAt, updatedAt, participants, messages
    }
}

struct ThreadParticipant: Identifiable, Codable {
    let id: String
    let threadId: String
    let userId: String
    let user: User
    let joinedAt: Date
    let lastRead: Date

    enum CodingKeys: String, CodingKey {
        case id, threadId, userId, user, joinedAt, lastRead
    }
}
