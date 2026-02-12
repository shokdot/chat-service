# Chat Service — API Endpoints

Base URL: **`{CHAT_SERVICE_URL}/api/v1/chat`**

---

## WebSocket

### GET `/ws` (WebSocket)

Connect to the chat WebSocket. **Auth:** Send `Authorization: Bearer <accessToken>` in the request headers when opening the WebSocket (e.g. via subprotocol or custom header if supported; otherwise connect from a context where the backend can inject the token, or use a query token if the server supports it).

**URL:** `ws://{host}:{port}/api/v1/chat/ws` (or `wss://` in production)

**Connection:** If auth fails, the server closes the connection with an error. On success, the client can send and receive JSON messages.

---

## Message format

### Outgoing (client → server)

**CHAT message:**

```json
{
  "type": "CHAT",
  "to": "userId-uuid",
  "content": "Hello"
}
```

- `to`: Recipient user ID (uuid).
- `content`: Non-empty string.

**GAME_INVITE message:**

```json
{
  "type": "GAME_INVITE",
  "to": "userId-uuid",
  "payload": { ... }
}
```

- `to`: Recipient user ID.
- `payload`: Object (e.g. roomId, inviterId).

---

### Incoming (server → client)

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

Possible error codes include: invalid JSON, invalid payload, unauthenticated, user blocked.

---

## Behavior

- **Storage:** CHAT and GAME_INVITE messages are stored. When the recipient connects, only undelivered messages (not yet marked as delivered) are sent. Messages are marked as delivered after being successfully sent via WebSocket, so they won't be re-sent on subsequent connections.
- **Blocking:** If the sender is blocked by the recipient (or vice versa), the server may respond with an ERROR and not deliver.
- **Internal:** Room-service calls `POST /api/v1/chat/internal/invitation-created` when an invitation is created; the chat service may create a GAME_INVITE or notification. This endpoint is for backend use only.

---

## Internal API (backend only)

### POST `/internal/invitation-created`

Called by room-service when a game invitation is created. **Auth:** Service token (e.g. `x-service-token`). Body and response are service-specific. Not for frontend use.

---

## Summary

| Type       | Path     | Auth   | Purpose                    |
|------------|----------|--------|----------------------------|
| WebSocket  | `/ws`    | Bearer | Real-time chat & invites   |
| HTTP       | `POST /internal/invitation-created` | Service | Backend webhook            |
