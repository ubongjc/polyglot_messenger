# Polyglot Messenger

A cross-platform messaging application where everyone types in their language and recipients see messages in theirs, with intelligent idiom warnings and adaptive tone based on relationships.

## Overview

Polyglot Messenger enables seamless communication across language barriers:
- Type in your native language
- Recipients automatically see translations in their language
- Idiom warnings prevent cultural misunderstandings
- Adaptive tone adjusts based on relationship context
- End-to-end encryption for privacy

## Repositories

This monorepo contains both web and iOS applications:

- **[polyglot_web/](./polyglot_web/)** - Next.js web application
- **[polyglot_ios/](./polyglot_ios/)** - Native iOS application

## Key Features

### 🌐 Universal Translation
- Real-time translation powered by AI
- Support for 100+ languages
- Context-aware translations

### 🔐 Privacy & Security
- End-to-end encryption (E2EE)
- Client-side encryption (AES-GCM)
- Zero-knowledge architecture
- GDPR compliant

### 🔑 Modern Authentication
- Passkeys/WebAuthn (primary)
- Magic links (fallback)
- Biometric protection
- Multi-device support

### 💬 Smart Messaging
- Thread-based conversations
- Pair-specific style profiles
- "Safe mode" for idiom avoidance
- Cross-language moderation

### 💰 Monetization
- Freemium subscription tiers
- Business licenses
- Per-seat pricing
- StoreKit & Stripe integration

## Architecture

### Web (Next.js)
- Framework: Next.js 15 + React 18
- Language: TypeScript 5
- Database: PostgreSQL 16 + Prisma
- Storage: Cloudflare R2
- Auth: Clerk (Passkeys)
- Payments: Stripe
- Hosting: Vercel

### iOS (SwiftUI)
- Framework: SwiftUI
- Language: Swift 5.9+
- Architecture: MVVM
- Encryption: CryptoKit
- Auth: ASAuthorizationController
- Payments: StoreKit
- Min iOS: 16.0

### Shared Infrastructure
- Database: PostgreSQL with pgvector
- Storage: Cloudflare R2 (S3-compatible)
- Observability: Sentry + OpenTelemetry
- Real-time: WebSockets/SSE
- API: RESTful with OpenAPI docs

## Data Model

Key entities:
- **User** - User accounts with auth provider sync
- **Thread** - Conversation containers
- **Message** - Encrypted messages with language metadata
- **StyleProfile** - Pair-specific tone preferences
- **Subscription** - Payment & entitlements
- **ModerationFlag** - Cross-language content safety

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- Xcode 15+ (for iOS)
- pnpm/npm
- Git

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/polyglot_messenger.git
cd polyglot_messenger
```

2. Set up web application:
```bash
cd polyglot_web
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma generate
npx prisma db push
npm run dev
```

3. Set up iOS application:
```bash
cd polyglot_ios
open PolyglotMessenger.xcodeproj
# Build and run in Xcode
```

See individual README files for detailed setup:
- [Web Setup Guide](./polyglot_web/README.md)
- [iOS Setup Guide](./polyglot_ios/README.md)

## Development

### Project Structure

```
polyglot_messenger/
├── polyglot_web/          # Next.js web app
│   ├── app/              # App Router pages & API
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── prisma/           # Database schema
├── polyglot_ios/         # iOS app
│   └── PolyglotMessenger/
│       ├── Models/       # Data models
│       ├── Views/        # SwiftUI views
│       ├── ViewModels/   # MVVM view models
│       ├── Networking/   # API client
│       └── Crypto/       # Encryption
└── README.md             # This file
```

### Tech Stack

#### Web
- Next.js 15 (App Router)
- TypeScript 5
- Tailwind CSS + shadcn/ui
- Prisma ORM
- Clerk Auth
- Stripe Payments

#### iOS
- SwiftUI
- Combine
- CryptoKit
- URLSession (async/await)
- ASAuthorizationController

#### Backend
- PostgreSQL 16
- pgvector (embeddings)
- Cloudflare R2
- WebSockets

## Security

- Client-side encryption (AES-GCM-256)
- Passkey authentication (FIDO2/WebAuthn)
- RBAC & ABAC authorization
- Content Security Policy
- OWASP compliance
- Regular security audits

## Compliance

- GDPR compliant (EU)
- CCPA compliant (California)
- Data export & deletion
- Privacy by design
- Encryption at rest & in transit

## Roadmap

### MVP (Current)
- [x] Authentication (Passkeys + Magic Links)
- [x] Thread-based messaging
- [x] End-to-end encryption
- [x] Basic UI (Web + iOS)
- [x] Database schema
- [ ] Translation integration
- [ ] Subscription billing

### Future
- [ ] Real-time WebSocket support
- [ ] Push notifications
- [ ] Voice messages
- [ ] Video calls
- [ ] Desktop apps (Electron)
- [ ] Android app (Kotlin/Compose)
- [ ] AI-powered features
- [ ] Advanced moderation

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Support

- Documentation: [docs.polyglotmessenger.com](https://docs.polyglotmessenger.com)
- Issues: [GitHub Issues](https://github.com/yourusername/polyglot_messenger/issues)
- Email: support@polyglotmessenger.com

## Acknowledgments

Built with modern web and iOS technologies, inspired by the vision of borderless communication.
