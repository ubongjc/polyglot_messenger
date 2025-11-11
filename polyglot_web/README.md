# Polyglot Messenger - Web Application

Next.js-based web application for Polyglot Messenger.

## Features

- 🌐 **Multi-language messaging** - Type in your language, recipients see it in theirs
- 🔐 **End-to-end encryption** - Client-side encryption using Web Crypto API
- 🔑 **Passkey authentication** - WebAuthn-first auth with magic link fallback
- 💬 **Real-time messaging** - Thread-based conversations with live updates
- 🎨 **Modern UI** - Built with Tailwind CSS and shadcn/ui
- 📱 **Responsive design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16 with Prisma 5
- **Storage**: Cloudflare R2 (S3-compatible)
- **Authentication**: Clerk (Passkeys + Magic Links)
- **Payments**: Stripe
- **Styling**: Tailwind CSS + shadcn/ui
- **Observability**: Sentry
- **API Documentation**: OpenAPI inline docs

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- pnpm/npm/yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Fill in the required environment variables in `.env`:
- Database connection string
- Clerk API keys
- Stripe API keys
- R2/S3 credentials
- Sentry DSN

3. Set up the database:

```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
polyglot_web/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── health/       # Health check endpoint
│   │   ├── threads/      # Thread management
│   │   └── webhooks/     # Webhook handlers
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── encryption.ts     # Client-side encryption
│   ├── r2.ts             # R2 storage utilities
│   └── utils.ts          # General utilities
├── prisma/
│   └── schema.prisma     # Database schema
└── middleware.ts          # Clerk auth middleware
```

## API Endpoints

### Health
- `GET /api/health` - System health check

### Threads
- `GET /api/threads` - List user's threads
- `POST /api/threads` - Create new thread
- `GET /api/threads/:id` - Get thread details
- `DELETE /api/threads/:id` - Leave thread

### Messages
- `POST /api/threads/:id/messages` - Send message

### Webhooks
- `POST /api/webhooks/clerk` - Clerk user sync webhook

## Database Schema

Key models:
- **User** - User accounts synced from Clerk
- **Thread** - Conversation containers
- **Message** - Encrypted messages with E2EE
- **StyleProfile** - Pair-specific tone preferences
- **Subscription** - Stripe subscription management
- **ModerationFlag** - Cross-language content moderation

## Security Features

- Client-side encryption (AES-GCM) for messages
- Passkey/WebAuthn authentication
- RBAC/ABAC authorization
- Encrypted storage with R2
- Content Security Policy
- OWASP best practices

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

### Docker

```bash
docker build -t polyglot-web .
docker run -p 3000:3000 polyglot-web
```

## Environment Variables

See `.env.example` for all required environment variables.

## License

MIT
