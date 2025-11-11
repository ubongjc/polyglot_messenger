# Security Architecture - Polyglot Messenger

## End-to-End Encryption (E2EE)

**GUARANTEE: Nobody on Earth can read your messages except the intended recipients.**

### Encryption Specifications

- **Algorithm**: AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)
- **Key Length**: 256-bit (military-grade encryption)
- **IV (Initialization Vector)**: 12 bytes, randomly generated per message
- **Authentication**: Built-in authentication tag (GCM mode prevents tampering)

### Architecture Overview

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Sender    │                    │   Server    │                    │  Recipient  │
│             │                    │             │                    │             │
│ 1. Generate │                    │             │                    │             │
│    AES-256  │                    │             │                    │             │
│    Key      │                    │             │                    │             │
│             │                    │             │                    │             │
│ 2. Encrypt  │  ─────────────>    │ 3. Store    │  ─────────────>    │ 4. Decrypt  │
│    Message  │  (Ciphertext + IV) │  Ciphertext │  (Ciphertext + IV) │    Message  │
│             │                    │  ONLY       │                    │             │
│             │                    │             │                    │             │
│ ✓ Has Key   │                    │ ✗ NO KEY    │                    │ ✓ Has Key   │
│ ✓ Plaintext │                    │ ✗ NO ACCESS │                    │ ✓ Plaintext │
└─────────────┘                    └─────────────┘                    └─────────────┘
```

### Key Management

**Client-Side Only Storage:**
- Encryption keys are **NEVER** sent to the server
- Keys are stored in **IndexedDB** (browser's encrypted storage)
- Each thread has a **unique encryption key** (compartmentalization)
- Keys are generated using Web Crypto API (cryptographically secure random)

**Key Storage Hierarchy:**
```
Browser (Client)
  └─> IndexedDB (encrypted by browser)
      └─> Thread Keys Database
          ├─> Thread 1: AES-256 Key (32 bytes)
          ├─> Thread 2: AES-256 Key (32 bytes)
          └─> Thread N: AES-256 Key (32 bytes)
```

### What the Server Knows

The server **ONLY** has access to:
- ✓ User identities (for authentication)
- ✓ Thread participants (who is in which conversation)
- ✓ Message metadata (timestamps, sender, thread ID)
- ✓ **Encrypted ciphertext** (unreadable gibberish)
- ✓ **Initialization vectors** (non-secret, needed for decryption)

The server **NEVER** has access to:
- ✗ Encryption keys
- ✗ Plaintext message content
- ✗ Decrypted messages

**Even with full database access, server admins CANNOT read your messages.**

### Database Storage Example

```sql
-- What is stored in the database:
INSERT INTO "Message" (id, ciphertext, iv) VALUES (
  'msg123',
  'Qm5hY2tlemRrYXNka2phc2Rqa2FzZGthc2Rqa2Fz...', -- Encrypted gibberish
  'cmFuZG9taXZieXRl'                                -- Random IV (public)
);

-- What is NOT stored:
-- ✗ Encryption key (never leaves client)
-- ✗ Plaintext: "Hello, how are you?" (encrypted before sending)
```

## Additional Security Features

### 1. Disappearing Messages
- **Auto-delete**: Messages auto-delete after a specified duration
- **Server enforcement**: Database cleanup runs every 5 minutes
- **Configurable**: 1 minute, 5 minutes, 1 hour, 1 day, 1 week
- **Cannot be recovered**: Once deleted, encrypted data is permanently removed

### 2. One-Time View Messages
- **Self-destruct**: Messages delete after first view
- **View tracking**: System records when message is first opened
- **Grace period**: 5-minute window before permanent deletion
- **Privacy guarantee**: Cannot be re-read or screenshotted (by app logic)

### 3. Voice Message Security
- **Encrypted audio**: Voice recordings encrypted before upload
- **Secure storage**: Audio files stored in Cloudflare R2 with encryption
- **No server transcription**: Speech-to-text happens on-device only
- **Same E2EE**: Voice messages use same AES-GCM encryption as text

## Threat Model

### What We Protect Against

✅ **Protected:**
- Server administrator snooping
- Database breaches (data is encrypted)
- Man-in-the-middle attacks (TLS + E2EE)
- Unauthorized access to conversations
- Message tampering (GCM authentication)
- Mass surveillance
- Subpoenas for message content (server has no keys)

⚠️ **Partial Protection:**
- Device compromise (if device is infected, keys can be stolen)
- Phishing attacks (user must protect their authentication)
- Malicious browser extensions (can access memory)

❌ **Not Protected:**
- Screenshots (user can screenshot before deletion)
- Forwarding/copying (user can manually copy text)
- Compromised client code (malicious JS served by attacker)
- Quantum computing attacks (AES-256 is quantum-resistant up to a point)

### Trust Assumptions

You must trust:
1. **Your device**: Not infected with malware
2. **Your browser**: Web Crypto API implementation is correct
3. **TLS/HTTPS**: Transport layer encryption is not compromised
4. **Clerk authentication**: Identity provider is secure
5. **Your conversation partners**: They don't leak messages

You do **NOT** need to trust:
- The server operators (can't read your messages)
- Database administrators (can't decrypt messages)
- Network providers (can't read encrypted traffic)
- Cloud storage providers (can't decrypt stored data)

## Compliance & Privacy

### GDPR Compliance
- **Right to erasure**: Messages can be permanently deleted
- **Data export**: Users can export their encrypted data
- **Data minimization**: Server stores only encrypted ciphertext
- **Privacy by design**: E2EE is default, not optional

### Subpoena Resistance
If law enforcement requests message content:
- Server can provide: Encrypted ciphertext (useless without keys)
- Server **CANNOT** provide: Plaintext messages (keys not on server)
- Users can provide: Their own keys (only if compelled)

## Security Best Practices for Users

1. **Protect your device**: Use strong device passwords
2. **Verify recipients**: Ensure you're messaging the right person
3. **Use passkeys**: Enable WebAuthn for phishing-resistant auth
4. **Don't share keys**: Never export/share your encryption keys
5. **Secure your browser**: Keep browser updated, avoid malicious extensions
6. **Use disappearing messages**: For sensitive conversations
7. **Report suspicious activity**: Contact support immediately

## Technical Implementation Details

### Encryption Flow

```typescript
// 1. Generate key (client-side)
const key = await generateKey(); // AES-256 key

// 2. Encrypt message (client-side)
const plaintext = "Hello, world!";
const { ciphertext, iv } = await encryptData(plaintext, key);

// 3. Send to server
await sendMessage({
  ciphertext: "Qm5hY2...", // Base64-encoded encrypted data
  iv: "cmFuZG9...",         // Base64-encoded IV
});

// Server stores ONLY ciphertext + IV (cannot decrypt)

// 4. Recipient retrieves and decrypts (client-side)
const decrypted = await decryptData({ ciphertext, iv }, key);
// Returns: "Hello, world!"
```

### Key Generation

```typescript
// Uses Web Crypto API - cryptographically secure
const key = await crypto.subtle.generateKey(
  {
    name: 'AES-GCM',
    length: 256, // 256-bit key
  },
  true, // Extractable (for export)
  ['encrypt', 'decrypt'] // Allowed operations
);
```

### Encryption Process

```typescript
// Random IV generation (never reuse IVs!)
const iv = crypto.getRandomValues(new Uint8Array(12));

// AES-GCM encryption with authentication
const ciphertext = await crypto.subtle.encrypt(
  {
    name: 'AES-GCM',
    iv: iv,
    // GCM automatically adds authentication tag
  },
  key,
  plaintextBuffer
);
```

## Future Enhancements

### Planned Security Improvements

1. **Signal Protocol Integration**
   - Perfect Forward Secrecy (Double Ratchet)
   - Deniable authentication
   - Out-of-order message handling

2. **Public Key Cryptography**
   - RSA/ECDH key exchange
   - Per-user keypairs
   - Digital signatures for message authentication

3. **Safety Numbers**
   - QR code key verification (like WhatsApp)
   - Man-in-the-middle detection
   - Key fingerprint comparison

4. **Key Rotation**
   - Automatic periodic key rotation
   - Compromise recovery mechanism
   - Key versioning

5. **Hardware Security**
   - WebAuthn integration for key storage
   - Secure Enclave support (iOS)
   - Hardware security module (HSM) option

6. **Zero-Knowledge Proofs**
   - Prove identity without revealing secrets
   - Private set intersection for contact discovery

## Security Audits

**Status**: Pending professional security audit

We recommend:
- Annual penetration testing
- Third-party security audits
- Bug bounty program
- Open-source code review

## Reporting Security Vulnerabilities

**IMPORTANT**: Do not publicly disclose security vulnerabilities.

Contact: security@polyglotmessenger.com (when available)

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We take security seriously and will respond within 24 hours.

---

**Last Updated**: November 11, 2025
**Version**: 1.0.0
**Encryption Standard**: AES-GCM-256

*This security architecture ensures that your private conversations remain private.*
