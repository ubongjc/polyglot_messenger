import Foundation

struct User: Identifiable, Codable {
    let id: String
    let email: String
    let name: String?
    let imageUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, email, name, imageUrl
    }
}
