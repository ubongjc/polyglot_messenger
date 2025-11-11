import Foundation
import CryptoKit

/// Client-side encryption manager using CryptoKit
/// Implements AES-GCM encryption for end-to-end encrypted messaging
class CryptoManager {
    static let shared = CryptoManager()

    private init() {}

    // MARK: - Key Management

    /// Generate a new symmetric encryption key
    func generateKey() -> SymmetricKey {
        return SymmetricKey(size: .bits256)
    }

    /// Export key to base64 string for storage
    func exportKey(_ key: SymmetricKey) -> String {
        let keyData = key.withUnsafeBytes { Data($0) }
        return keyData.base64EncodedString()
    }

    /// Import key from base64 string
    func importKey(from base64String: String) -> SymmetricKey? {
        guard let keyData = Data(base64Encoded: base64String) else {
            return nil
        }
        return SymmetricKey(data: keyData)
    }

    // MARK: - Encryption/Decryption

    /// Encrypt data using AES-GCM
    func encrypt(data: Data, using key: SymmetricKey) throws -> (ciphertext: String, iv: String) {
        let sealedBox = try AES.GCM.seal(data, using: key)

        guard let ciphertext = sealedBox.ciphertext.base64EncodedString() as String?,
              let nonce = sealedBox.nonce.withUnsafeBytes({ Data($0) }).base64EncodedString() as String? else {
            throw CryptoError.encryptionFailed
        }

        return (ciphertext: ciphertext, iv: nonce)
    }

    /// Encrypt string using AES-GCM
    func encrypt(string: String, using key: SymmetricKey) throws -> (ciphertext: String, iv: String) {
        guard let data = string.data(using: .utf8) else {
            throw CryptoError.invalidInput
        }
        return try encrypt(data: data, using: key)
    }

    /// Decrypt data using AES-GCM
    func decrypt(ciphertext: String, iv: String, using key: SymmetricKey) throws -> Data {
        guard let ciphertextData = Data(base64Encoded: ciphertext),
              let nonceData = Data(base64Encoded: iv),
              let nonce = try? AES.GCM.Nonce(data: nonceData) else {
            throw CryptoError.invalidInput
        }

        let sealedBox = try AES.GCM.SealedBox(nonce: nonce, ciphertext: ciphertextData, tag: Data())
        let decryptedData = try AES.GCM.open(sealedBox, using: key)

        return decryptedData
    }

    /// Decrypt to string using AES-GCM
    func decryptToString(ciphertext: String, iv: String, using key: SymmetricKey) throws -> String {
        let data = try decrypt(ciphertext: ciphertext, iv: iv, using: key)
        guard let string = String(data: data, encoding: .utf8) else {
            throw CryptoError.decodingFailed
        }
        return string
    }
}

// MARK: - Errors

enum CryptoError: LocalizedError {
    case encryptionFailed
    case decryptionFailed
    case invalidInput
    case decodingFailed
    case keyGenerationFailed

    var errorDescription: String? {
        switch self {
        case .encryptionFailed:
            return "Failed to encrypt data"
        case .decryptionFailed:
            return "Failed to decrypt data"
        case .invalidInput:
            return "Invalid input data"
        case .decodingFailed:
            return "Failed to decode decrypted data"
        case .keyGenerationFailed:
            return "Failed to generate encryption key"
        }
    }
}
