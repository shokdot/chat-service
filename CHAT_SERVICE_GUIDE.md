# Chat Service - How It Works

## Overview

The chat service provides **1v1 (one-to-one) real-time messaging** and game invites via WebSocket connections. All messages are persisted in a SQLite database using Prisma, ensuring messages are delivered even when recipients are offline.

**Note**: This is a **1v1 chat system** - each conversation is between exactly two users. There is no group chat or channel functionality.

## Backend Architecture

### Connection Flow

1. **WebSocket Endpoint**: `GET /api/chat/ws`
2. **Authentication**: Requires JWT token in `Authorization` header
3. **Connection Process**:
   - Client connects with JWT token
   - Server validates token and extracts `userId`
   - User is added to active connections
   - **Undelivered messages are automatically sent** (from last 7 days, max 100 messages)
   - WebSocket connection is established

### Message Flow

#### Sending a Message

1. **Client sends message** via WebSocket:
   ```json
   {
     "type": "CHAT",
     "to": "recipient-user-id",
     "content": "Hello!"
   }
   ```

2. **Server processing**:
   - Validates JSON format
   - Validates message structure
   - Checks authentication
   - Checks if sender is blocked by recipient
   - **Stores message in database** (always, even if recipient offline)
   - Attempts to deliver to recipient if online via WebSocket
   - **Sends notification** via notification-service (for offline users or indicator purposes)
   - No error returned if recipient is offline (message is stored)

#### Receiving Messages

1. **Real-time delivery** (if recipient is online):
   - Message is immediately sent via WebSocket
   - Same format as stored message

2. **Offline delivery** (when recipient connects):
   - On connection, server fetches undelivered messages
   - Messages are sent sequentially in chronological order
   - Messages from last 7 days are retrieved (max 100)

## Message Types

### Incoming Messages (Client → Server)

#### CHAT Message
```typescript
{
  type: "CHAT";
  to: string;           // Recipient user ID
  content: string;      // Message text (non-empty)
}
```

#### GAME_INVITE Message
```typescript
{
  type: "GAME_INVITE";
  to: string;                    // Recipient user ID
  payload: Record<string, any>;  // Game invite data
}
```

### Outgoing Messages (Server → Client)

#### CHAT Message
```typescript
{
  type: "CHAT";
  from: string;      // Sender user ID
  content: string;   // Message text
  sentAt: string;   // ISO 8601 timestamp
}
```

#### GAME_INVITE Message
```typescript
{
  type: "GAME_INVITE";
  from: string;              // Sender user ID
  payload: Record<string, any>;  // Game invite data
  sentAt: string;           // ISO 8601 timestamp
}
```

#### ERROR Message
```typescript
{
  type: "ERROR";
  code: string;      // Error code (see below)
  message: string;   // Human-readable error message
}
```

### Error Codes

- `INVALID_JSON` - Invalid JSON payload
- `INVALID_PAYLOAD` - Invalid message structure
- `UNAUTHENTICATED` - User is not authenticated
- `USER_BLOCKED` - Cannot communicate with this user (blocked)
- `INTERNAL_ERROR` - Server error occurred

## Frontend Integration Guide

### 1. WebSocket Connection

```typescript
// Connect to chat service
const ws = new WebSocket('ws://localhost:3006/api/chat/ws', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});
```

### 2. Connection Event Handlers

```typescript
ws.onopen = () => {
  console.log('Connected to chat service');
  // Undelivered messages will be automatically received
};

ws.onmessage = (event) => {
  const message: OutgoingMessage = JSON.parse(event.data);
  
  switch (message.type) {
    case 'CHAT':
      handleChatMessage(message);
      break;
    case 'GAME_INVITE':
      handleGameInvite(message);
      break;
    case 'ERROR':
      handleError(message);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from chat service');
  // Implement reconnection logic
};
```

### 3. Sending Messages

#### Send Chat Message
```typescript
function sendChatMessage(recipientId: string, content: string) {
  const message: IncomingChatMessage = {
    type: 'CHAT',
    to: recipientId,
    content: content
  };
  
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket is not open');
  }
}
```

#### Send Game Invite
```typescript
function sendGameInvite(recipientId: string, gameData: any) {
  const message: IncomingChatMessage = {
    type: 'GAME_INVITE',
    to: recipientId,
    payload: gameData
  };
  
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
```

### 4. Handling Incoming Messages

```typescript
function handleChatMessage(message: OutgoingMessage & { type: 'CHAT' }) {
  // Display message in UI
  // message.from - sender ID
  // message.content - message text
  // message.sentAt - timestamp
  addMessageToChat(message.from, message.content, message.sentAt);
}

function handleGameInvite(message: OutgoingMessage & { type: 'GAME_INVITE' }) {
  // Show game invite notification
  // message.from - sender ID
  // message.payload - game invite data
  // message.sentAt - timestamp
  showGameInviteNotification(message.from, message.payload);
}

function handleError(error: OutgoingMessage & { type: 'ERROR' }) {
  // Display error to user
  switch (error.code) {
    case 'USER_BLOCKED':
      showNotification('You cannot send messages to this user');
      break;
    case 'UNAUTHENTICATED':
      // Re-authenticate and reconnect
      reconnect();
      break;
    default:
      showNotification(`Error: ${error.message}`);
  }
}
```

### 5. Handling Undelivered Messages

When a user connects, the server automatically sends undelivered messages. These arrive as regular `CHAT` or `GAME_INVITE` messages:

```typescript
ws.onmessage = (event) => {
  const message: OutgoingMessage = JSON.parse(event.data);
  
  // Check if this is an undelivered message (older timestamp)
  const messageDate = new Date(message.sentAt);
  const now = new Date();
  const isOldMessage = (now.getTime() - messageDate.getTime()) > 1000; // More than 1 second old
  
  if (isOldMessage) {
    // This is an undelivered message - mark it appropriately in UI
    handleUndeliveredMessage(message);
  } else {
    // This is a real-time message
    handleRealtimeMessage(message);
  }
};
```

### 6. Reconnection Strategy

```typescript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connect() {
  ws = new WebSocket('ws://localhost:3006/api/chat/ws', {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  
  ws.onclose = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${reconnectAttempts})`);
        connect();
      }, 1000 * reconnectAttempts); // Exponential backoff
    }
  };
  
  ws.onopen = () => {
    reconnectAttempts = 0; // Reset on successful connection
  };
}
```

## Key Features

### ✅ Always Persistent
- All messages are stored in database
- Messages are delivered even if recipient was offline
- No message loss

### ✅ Real-time Delivery
- Instant delivery when recipient is online
- Automatic delivery of missed messages on reconnect

### ✅ Notifications
- **Automatic notifications** sent via notification-service for all new messages
- Notifications help show unread message indicators
- Works even when user is offline
- **Privacy-focused**: Notifications only indicate unread messages, not message content
- Notification types:
  - `NEW_MESSAGE` - For chat messages (includes sender ID only)
  - `GAME_INVITE` - For game invites (includes sender ID)

### ✅ Blocking Support
- Server checks if users are blocked before sending
- Blocked users cannot send messages

### ✅ Error Handling
- Comprehensive error codes
- Graceful error messages
- Connection error recovery

## Database Schema

Messages are stored with:
- `id` - Unique message ID (UUID)
- `fromUserId` - Sender user ID
- `toUserId` - Recipient user ID
- `type` - Message type ("CHAT" or "GAME_INVITE")
- `content` - Message content (for CHAT type)
- `payload` - JSON payload (for GAME_INVITE type)
- `sentAt` - Timestamp

## Notifications

### How Notifications Work

When a message is sent:
1. **Message is stored** in database
2. **Message is delivered** via WebSocket if recipient is online
3. **Notification is sent** via notification-service (always, for indicator purposes)

### Notification Format

#### NEW_MESSAGE Notification
```typescript
{
  type: "NEW_MESSAGE",
  message: {
    from: string        // Sender user ID (indicates unread message from this user)
  }
}
```

#### GAME_INVITE Notification
```typescript
{
  type: "GAME_INVITE",
  message: {
    from: string         // Sender user ID
  }
}
```

**Note**: Notifications only indicate that there's an unread message from a user - they don't include message content for privacy.

### Frontend: Handling Notifications

The notification-service sends notifications via its own WebSocket. You should:

1. **Connect to notification WebSocket** separately
2. **Show notification indicators** when `NEW_MESSAGE` or `GAME_INVITE` notifications arrive
3. **Update unread counts** based on notifications
4. **Mark notifications as read** when user opens the chat

## Frontend: What to Do When NEW_MESSAGE Notification Arrives

When the frontend receives a `NEW_MESSAGE` notification from the notification-service, here's what should happen:

### 1. Parse the Notification

```typescript
const notification = JSON.parse(event.data);
// notification structure:
// {
//   type: "NEW_MESSAGE",
//   message: "{\"from\":\"sender-user-id\"}",
//   id: "notification-id",
//   createdAt: "2024-01-01T00:00:00.000Z"
// }

const data = JSON.parse(notification.message);
// data = { from: "sender-user-id" }
```

### 2. Update Unread Message Indicator

**Show visual indicator** that there's an unread message from this user:

```typescript
if (notification.type === 'NEW_MESSAGE') {
  const data = JSON.parse(notification.message);
  const senderId = data.from;
  
  // Option 1: Update unread count for this conversation
  incrementUnreadCount(senderId);
  
  // Option 2: Mark conversation as having unread messages
  markConversationAsUnread(senderId);
  
  // Option 3: Show badge/indicator on chat list item
  showUnreadBadge(senderId);
}
```

### 3. Update UI State

**Update your application state** to track unread messages:

```typescript
// Example: Update unread messages state
const unreadMessages = {
  [senderId]: (unreadMessages[senderId] || 0) + 1
};

// Or mark conversation as unread
const conversations = {
  [senderId]: {
    ...conversations[senderId],
    hasUnread: true,
    unreadCount: (conversations[senderId]?.unreadCount || 0) + 1
  }
};
```

### 4. Show Browser Notification (Optional)

**Show a browser/system notification** if user is not actively viewing the chat:

```typescript
// Check if user is currently viewing this conversation
const isViewingChat = currentChatUserId === senderId;
const isAppFocused = document.hasFocus();

if (!isViewingChat || !isAppFocused) {
  // Show browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('New Message', {
      body: `You have a new message from ${getUserName(senderId)}`,
      icon: '/icon.png',
      tag: `chat-${senderId}`, // Prevent duplicate notifications
      requireInteraction: false
    });
  }
}
```

### 5. Update Chat List UI

**Update the chat list** to show unread indicators:

```typescript
// In your chat list component
function ChatListItem({ userId, userName }) {
  const hasUnread = unreadMessages[userId] > 0;
  
  return (
    <div className={`chat-item ${hasUnread ? 'unread' : ''}`}>
      <span>{userName}</span>
      {hasUnread && (
        <span className="unread-badge">{unreadMessages[userId]}</span>
      )}
    </div>
  );
}
```

### 6. Handle Message Delivery

**Important**: The `NEW_MESSAGE` notification only indicates there's an unread message. The actual message content will arrive via:

- **Real-time**: If user is online and connected to chat WebSocket, the message will arrive immediately
- **On connect**: If user was offline, messages will be sent when they connect to chat WebSocket

**You should NOT fetch messages** when notification arrives. The chat WebSocket handles message delivery automatically.

### 7. Mark Notification as Read (When User Views Chat)

**When user opens the conversation**, mark the notification as read:

```typescript
async function openChat(userId: string) {
  // Open chat UI
  setCurrentChatUserId(userId);
  
  // Mark notification as read via API
  await fetch(`/api/v1/notifications/${notificationId}`, {
    method: 'PUT', // or whatever endpoint marks as read
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  // Clear unread indicator
  clearUnreadCount(userId);
}
```

### Complete Example

```typescript
// Connect to notification service WebSocket
const notificationWs = new WebSocket('ws://localhost:3002/api/v1/notifications/ws', {
  headers: { 'Authorization': `Bearer ${token}` }
});

notificationWs.onmessage = async (event) => {
  const notification = JSON.parse(event.data);
  
  if (notification.type === 'NEW_MESSAGE') {
    const data = JSON.parse(notification.message);
    const senderId = data.from;
    
    // 1. Update unread count
    setUnreadMessages(prev => ({
      ...prev,
      [senderId]: (prev[senderId] || 0) + 1
    }));
    
    // 2. Mark conversation as unread
    setConversations(prev => ({
      ...prev,
      [senderId]: {
        ...prev[senderId],
        hasUnread: true
      }
    }));
    
    // 3. Show browser notification if not viewing chat
    if (currentChatUserId !== senderId || !document.hasFocus()) {
      showBrowserNotification(`New message from ${getUserName(senderId)}`);
    }
    
    // 4. Update UI (React example)
    // Component will re-render with new unread count
  }
  
  if (notification.type === 'GAME_INVITE') {
    const data = JSON.parse(notification.message);
    // Show game invite indicator
    showGameInviteIndicator(data.from);
  }
};
```

### Summary: Frontend Actions for NEW_MESSAGE

1. ✅ **Parse notification** to extract sender ID
2. ✅ **Update unread count** for that user/conversation
3. ✅ **Show visual indicator** (badge, highlight, etc.)
4. ✅ **Show browser notification** (if user not viewing chat)
5. ✅ **Update UI state** to reflect unread status
6. ✅ **Wait for actual message** via chat WebSocket (don't fetch)
7. ✅ **Mark notification as read** when user opens the chat

## Best Practices

1. **Always check WebSocket state** before sending
2. **Handle errors gracefully** - show user-friendly messages
3. **Implement reconnection logic** for reliability
4. **Distinguish between real-time and undelivered messages** in UI
5. **Store messages locally** if needed for offline viewing
6. **Validate message format** before sending
7. **Handle authentication errors** by re-authenticating
8. **Use notifications for indicators** - show unread message badges based on notifications
9. **Mark notifications as read** when user views the chat

## Example Frontend Implementation

```typescript
class ChatService {
  private ws: WebSocket | null = null;
  private jwtToken: string;
  
  constructor(jwtToken: string) {
    this.jwtToken = jwtToken;
  }
  
  connect() {
    this.ws = new WebSocket('ws://localhost:3006/api/chat/ws', {
      headers: { 'Authorization': `Bearer ${this.jwtToken}` }
    });
    
    this.ws.onopen = () => {
      console.log('Connected');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected');
      // Implement reconnection
    };
  }
  
  sendMessage(to: string, content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    this.ws.send(JSON.stringify({
      type: 'CHAT',
      to,
      content
    }));
  }
  
  private handleMessage(message: OutgoingMessage) {
    // Handle based on message type
  }
}
```
