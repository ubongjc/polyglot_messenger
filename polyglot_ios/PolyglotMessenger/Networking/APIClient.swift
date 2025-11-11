import Foundation

/// API client for communicating with the Polyglot Messenger backend
class APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession
    private var authToken: String?

    private init() {
        // TODO: Replace with actual API URL
        self.baseURL = URL(string: ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:3000")!

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Authentication

    func setAuthToken(_ token: String?) {
        self.authToken = token
    }

    // MARK: - Request Builder

    private func buildRequest(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil
    ) throws -> URLRequest {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        return request
    }

    // MARK: - Generic Request

    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        var bodyData: Data?
        if let body = body {
            bodyData = try JSONEncoder().encode(body)
        }

        let request = try buildRequest(endpoint: endpoint, method: method, body: bodyData)
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Threads

    func getThreads(limit: Int = 20, offset: Int = 0) async throws -> ThreadsResponse {
        return try await request(
            endpoint: "/api/threads?limit=\(limit)&offset=\(offset)",
            method: "GET"
        )
    }

    func getThread(id: String) async throws -> Thread {
        return try await request(
            endpoint: "/api/threads/\(id)",
            method: "GET"
        )
    }

    func createThread(participantUserIds: [String]) async throws -> Thread {
        let body = CreateThreadRequest(participantUserIds: participantUserIds)
        return try await request(
            endpoint: "/api/threads",
            method: "POST",
            body: body
        )
    }

    // MARK: - Messages

    func sendMessage(threadId: String, message: CreateMessageRequest) async throws -> Message {
        return try await request(
            endpoint: "/api/threads/\(threadId)/messages",
            method: "POST",
            body: message
        )
    }
}

// MARK: - Request/Response Types

struct ThreadsResponse: Codable {
    let threads: [Thread]
    let total: Int
    let limit: Int
    let offset: Int
}

struct CreateThreadRequest: Codable {
    let participantUserIds: [String]
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}
