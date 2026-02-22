# Chat Service

> Part of the [ft_transcendence](https://github.com/shokdot/ft_transcendence) project.

Real-time chat and game-invite microservice. Provides WebSocket-based messaging between users; stores messages and delivers them when recipients reconnect. Also exposes an internal webhook for room-service to trigger game invitations.

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Fastify 5 + WebSocket
- **ORM**: Prisma (SQLite)
- **Auth**: JWT Bearer (WebSocket), service token (internal)

## Quick Start

```bash
npm install
npm run dev
```

Service listens on `HOST:PORT` (default `0.0.0.0:3006`).

### Docker

Built from monorepo root; see project `Dockerfile` and `docker-compose*.yml`.

## Environment

| Variable                   | Required | Description                      |
|----------------------------|----------|----------------------------------|
| `PORT`                     | No       | Server port (default: 3006)      |
| `HOST`                     | No       | Bind address (default: 0.0.0.0)  |
| `USER_SERVICE_URL`         | Yes      | User service base URL            |
| `NOTIFICATION_SERVICE_URL` | Yes      | Notification service base URL    |
| `SERVICE_TOKEN`            | Yes      | Service-to-service token         |
| `JWT_SECRET`               | Yes      | Access token verification        |
| `DATABASE_URL`             | Yes      | Database URL                     |

---

## API Endpoints

Base URL: **`{CHAT_SERVICE_URL}/api/v1/chat`**

### Error Response Format

```json
{
  "type": "ERROR",
  "code": "ERROR_CODE",
  "message": "Human-readable message"
}
```

---

### WebSocket

#### `GET /ws` (WebSocket Upgrade)

Connect to the chat WebSocket. **Auth:** `Authorization: Bearer <accessToken>` header when opening the connection.

**URL:** `ws://{host}:{port}/api/v1/chat/ws` (or `wss://` in production)

If auth fails, the server closes the connection. On success, client can send and receive JSON messages.

---

#### Client → Server Messages

**CHAT:**

```json
{
  "type": "CHAT",
  "to": "userId-uuid",
  "content": "Hello"
}
```

**GAME_INVITE:**

```json
{
  "type": "GAME_INVITE",
  "to": "userId-uuid",
  "payload": { "roomId": "...", "inviterId": "..." }
}
```

---

#### Server → Client Messages

**CHAT:**

```json
{
  "type": "CHAT",
  "from": "userId-uuid",
  "content": "Hello",
  "sentAt": "ISO8601"
}
```

**GAME_INVITE:**

```json
{
  "type": "GAME_INVITE",
  "from": "userId-uuid",
  "payload": { ... },
  "sentAt": "ISO8601"
}
```

**ERROR:**

```json
{
  "type": "ERROR",
  "code": "ERROR_CODE",
  "message": "Human-readable message"
}
```

Possible error codes: invalid JSON, invalid payload, unauthenticated, user blocked.

---

#### Behavior

- **Storage:** Messages are persisted. Undelivered messages are sent when recipient reconnects and marked as delivered.
- **Blocking:** If sender is blocked by recipient (or vice versa), an ERROR is returned and message is not delivered.

---

### Internal API (backend only)

#### `POST /internal/invitation-created`

Called by room-service when a game invitation is created. Triggers a GAME_INVITE message or notification.

**Auth:** Service token (`x-service-token` header). Not for frontend use.

---

### Summary

| Type      | Path                              | Auth    | Purpose                   |
|-----------|-----------------------------------|---------|---------------------------|
| WebSocket | `/ws`                             | Bearer  | Real-time chat & invites  |
| HTTP POST | `/internal/invitation-created`    | Service | Backend invitation webhook |
