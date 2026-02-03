# Chat Service

Chat and game-invite microservice for the ft_transcendence platform. Provides WebSocket-based real-time chat and game invitations; stores messages and delivers to online users or when they reconnect.

## Features

- **WebSocket chat**: Connect with Bearer token; send/receive CHAT and GAME_INVITE messages
- **Message storage**: Messages persisted and delivered on reconnect
- **Internal API**: Invitation-created webhook for room-service

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Fastify 5 + WebSocket
- **ORM**: Prisma (SQLite)

## Quick Start

### Prerequisites

- Node.js 20+
- Environment variables (see [Environment](#environment))

### Install & Run

```bash
npm install
npm run dev
```

- **Dev**: `npm run dev` (runs Prisma deploy + generate)
- **Build**: `npm run build`
- **Start**: `npm start` (production)

Service listens on `HOST:PORT` (default `0.0.0.0:3006`).

### Docker

Built from monorepo root; see project `Dockerfile` and `docker-compose*.yml`.

## Environment

| Variable                   | Required | Description                    |
|----------------------------|----------|--------------------------------|
| `PORT`                     | No       | Server port (default: 3006)    |
| `HOST`                     | No       | Bind address (default: 0.0.0.0)|
| `USER_SERVICE_URL`         | Yes      | User service base URL          |
| `NOTIFICATION_SERVICE_URL` | Yes      | Notification service base URL  |
| `SERVICE_TOKEN`            | Yes      | Service-to-service token       |
| `JWT_SECRET`                | Yes      | Access token verification     |
| `JWT_REFRESH_SECRET`        | Yes      | Refresh token (if needed)      |
| `JWT_TWO_FA`                | Yes      | 2FA token (if needed)         |
| `DATABASE_URL`              | Yes      | Database URL                   |

API prefix defaults to `/api/v1` (from core).

## API Base URL

- **WebSocket**: `ws://{host}:{port}/api/v1/chat/ws` (or `wss://` in production)
- **Internal**: `POST /api/v1/chat/internal/invitation-created` (service-to-service)

## Documentation

- **[API Endpoints](docs/api-endpoints.md)** — WebSocket URL, auth, message types, and internal API.
- **[Frontend Integration Guide](docs/frontend-integration-guide.md)** — How to connect and use chat from React/Next.js.

## Project Structure

```
src/
├── ws/              # WebSocket handler, message/connection handlers
├── wsManager/       # Connections, message store, socket manager
├── invitation/      # Internal invitation-created controller
├── services/       # Notification integration
├── routes/         # WebSocket + internal routes
├── types/           # Message types
└── utils/           # env, prisma, validation
prisma/
└── schema.prisma
```

## License

Part of ft_transcendence project.
