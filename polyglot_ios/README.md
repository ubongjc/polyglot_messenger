# Polyglot Messenger - iOS Application

Native iOS application for Polyglot Messenger built with SwiftUI.

## Features

- 🌐 **Multi-language messaging** - Type in your language, recipients see it in theirs
- 🔐 **End-to-end encryption** - CryptoKit-based client-side encryption
- 🔑 **Passkey authentication** - WebAuthn/Passkey support with magic link fallback
- 💬 **Real-time messaging** - Thread-based conversations
- 🎨 **Native UI** - Built with SwiftUI and modern iOS design patterns
- 📱 **iOS 16+** - Leverages latest iOS capabilities

## Tech Stack

- **Framework**: SwiftUI
- **Language**: Swift 5.9+
- **Architecture**: MVVM
- **Networking**: URLSession with async/await
- **Encryption**: CryptoKit (AES-GCM)
- **Authentication**: ASAuthorizationController (Passkeys)
- **Minimum iOS**: 16.0

## Getting Started

### Prerequisites

- Xcode 15+
- iOS 16+ device or simulator
- Active Apple Developer account (for passkey testing)

### Installation

1. Open the project:

```bash
open PolyglotMessenger.xcodeproj
```

2. Configure environment:

Set the API base URL in your build configuration or environment:
```swift
API_BASE_URL=https://your-api.example.com
```

3. Build and run:
- Select your target device/simulator
- Press `Cmd+R` to build and run

## Project Structure

```
PolyglotMessenger/
├── Models/                      # Data models
│   ├── User.swift
│   ├── Thread.swift
│   └── Message.swift
├── ViewModels/                  # View models (MVVM)
│   ├── AuthViewModel.swift
│   └── MessagingViewModel.swift
├── Views/                       # Shared views
│   └── MainTabView.swift
├── Features/                    # Feature modules
│   ├── Auth/
│   │   └── SignInView.swift
│   ├── Messaging/
│   │   ├── ThreadListView.swift
│   │   └── ThreadDetailView.swift
│   └── Settings/
│       └── SettingsView.swift
├── Networking/                  # API client
│   └── APIClient.swift
├── Crypto/                      # Encryption
│   └── CryptoManager.swift
└── Resources/
    └── Info.plist
```

## Architecture

### MVVM Pattern

The app follows the Model-View-ViewModel pattern:
- **Models**: Data structures matching API responses
- **ViewModels**: Business logic and state management
- **Views**: SwiftUI views (declarative UI)

### Key Components

#### CryptoManager
Handles client-side encryption/decryption using CryptoKit:
- AES-GCM encryption
- 256-bit symmetric keys
- Secure key storage (Keychain)

#### APIClient
Manages all network requests:
- RESTful API communication
- Automatic JSON encoding/decoding
- Bearer token authentication
- Error handling

#### AuthViewModel
Manages authentication state:
- Passkey/WebAuthn sign-in
- Magic link fallback
- Token management
- User session

#### MessagingViewModel
Handles messaging functionality:
- Thread management
- Message encryption/decryption
- Real-time updates
- Local caching

## Security

### End-to-End Encryption

Messages are encrypted on-device before sending:
1. Generate symmetric key (AES-256)
2. Encrypt message content
3. Send ciphertext + IV to server
4. Decrypt on recipient device

### Authentication

- Primary: Passkeys (WebAuthn)
- Fallback: Magic links
- Token storage: Keychain
- Biometric protection

## Features

### Implemented

✅ Passkey authentication UI
✅ Magic link sign-in flow
✅ Thread list view
✅ Message composition
✅ Client-side encryption (CryptoKit)
✅ Settings screen
✅ Basic networking layer

### Coming Soon

⏳ Translation integration
⏳ Idiom warnings
⏳ Style profile management
⏳ Push notifications
⏳ StoreKit integration
⏳ WebSocket support

## Development

### Running Tests

```bash
xcodebuild test -scheme PolyglotMessenger -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Code Style

- Follow Swift API Design Guidelines
- Use SwiftLint for consistency
- Document public APIs

## Deployment

### TestFlight

1. Archive the app in Xcode
2. Upload to App Store Connect
3. Distribute via TestFlight

### App Store

1. Complete App Store metadata
2. Submit for review
3. Release when approved

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+

## License

MIT
