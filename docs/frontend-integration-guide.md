# Frontend Integration Guide — Chat Service

How a **React/Next.js** frontend should integrate with the Chat Service: WebSocket connection, auth, and message flows.

---

## Base URL and auth

- **WebSocket URL**: `ws://{host}:{port}/api/v1/chat/ws` (use `wss://` in production).
- **Auth**: The WebSocket connection must be authenticated. The server expects the access token (e.g. in `Authorization: Bearer <accessToken>`). How the token is sent depends on your setup:
  - If the WebSocket client allows custom headers, pass `Authorization: Bearer <accessToken>`.
  - If not (e.g. browser `WebSocket` does not support headers), the backend may support a query param (e.g. `?token=...`); check server implementation. Alternatively, use a same-origin HTTP endpoint that returns a short-lived token, then use that in the query for the WebSocket URL.

---

## 1. Connect to chat

**Purpose:** Open a persistent connection for real-time chat and game invites.

**Flow:**

1. Obtain access token (from Auth Service login/refresh).
2. Open WebSocket to `wss://{host}:{port}/api/v1/chat/ws` with auth (header or query, as supported).
3. On open: connection ready; optionally request or display undelivered messages (server may send them automatically on connect).
4. On message: parse JSON; handle `CHAT`, `GAME_INVITE`, `ERROR`.
5. On close/error: clear UI, optionally reconnect (e.g. after refreshing token).

**Example (pseudo):**

```ts
const ws = new WebSocket(
  `wss://${host}/api/v1/chat/ws?token=${accessToken}`
  // or use a library that supports headers
);
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'CHAT') {
    appendChat(msg.from, msg.content, msg.sentAt);
  } else if (msg.type === 'GAME_INVITE') {
    showGameInvite(msg.from, msg.payload);
  } else if (msg.type === 'ERROR') {
    showError(msg.code, msg.message);
  }
};
```

---

## 2. Send chat message

**Purpose:** Send a text message to another user.

**Flow:** Send a JSON string over the WebSocket:

```json
{
  "type": "CHAT",
  "to": "<recipientUserId>",
  "content": "Hello"
}
```

- `content` must be a non-empty string.
- If the recipient is offline, the message is stored and delivered when they connect.

---

## 3. Send game invite

**Purpose:** Send a game invitation to another user (e.g. after creating an invitation via room-service).

**Flow:** Send:

```json
{
  "type": "GAME_INVITE",
  "to": "<recipientUserId>",
  "payload": { "roomId": "...", "inviterId": "...", ... }
}
```

- `payload` is an object; structure should match what room-service and frontend expect (e.g. roomId, inviterId).

---

## 4. Handle incoming messages

**CHAT:** Display in UI (from `msg.from`, content `msg.content`, time `msg.sentAt`).

**GAME_INVITE:** Show “Accept” / “Decline”; on accept, call room-service to accept the invitation and navigate to the game (use `payload.roomId` or similar).

**ERROR:** Show `msg.message` and/or handle `msg.code` (e.g. USER_BLOCKED, UNAUTHENTICATED).

---

## 5. Reconnection and token refresh

- If the WebSocket closes (e.g. 401/403), refresh the access token (Auth Service) and reconnect with the new token.
- On reconnect, the server may send undelivered messages; render them in the same way as live messages.

---

## Quick reference

| Action           | What to do                                                                 |
|------------------|----------------------------------------------------------------------------|
| Connect          | Open WebSocket to `/api/v1/chat/ws` with Bearer token (header or query)   |
| Send chat        | Send `{ type: "CHAT", to: userId, content: "..." }`                       |
| Send game invite | Send `{ type: "GAME_INVITE", to: userId, payload: { ... } }`               |
| Receive CHAT     | Show message from `from`, `content`, `sentAt`                              |
| Receive GAME_INVITE | Show accept/decline; on accept use room-service + navigate to game       |
| Receive ERROR    | Show message; handle code (e.g. re-auth, block info)                      |

Use the same access token as for Auth Service; refresh on 401 and reconnect the WebSocket with the new token.
