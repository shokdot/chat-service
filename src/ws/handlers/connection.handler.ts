import { WebSocket } from "ws";
import { FastifyRequest } from "fastify";
import { chatConnections } from "src/wsManager/chatConnections.js";
import { messageStore } from "src/wsManager/messageStore.js";
import type { OutgoingMessage } from "src/types/message.js";

export const handleClose = (userId: string | undefined, ws: WebSocket): void => {
	if (userId) {
		// Only remove if this is still the active connection for this user.
		// A newer connection may have already replaced this one on reconnect.
		if (chatConnections.get(userId) === ws) {
			chatConnections.remove(userId);
		}
	}
};

export const handleError = (
	error: Error,
	userId: string | undefined,
	ws: WebSocket,
	request: FastifyRequest
): void => {
	request.log.error(
		{
			userId,
			event: "chat_ws_error",
			error: error instanceof Error ? error.message : String(error)
		},
		"Chat WS error"
	);

	if (userId) {
		if (chatConnections.get(userId) === ws) {
			chatConnections.remove(userId);
		}
	}
};

export const sendUndeliveredMessages = async (
	userId: string,
	ws: WebSocket
): Promise<void> => {
	try {
		const messages = await messageStore.getUndeliveredMessages(userId);

		const deliveredIds: string[] = [];

		for (const msg of messages) {
			const outgoing: OutgoingMessage =
				msg.type === "CHAT"
					? {
						type: "CHAT",
						from: msg.from,
						content: msg.content,
						sentAt: msg.sentAt
					}
					: {
						type: "GAME_INVITE",
						from: msg.from,
						payload: msg.payload,
						sentAt: msg.sentAt
					};

			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify(outgoing));
				deliveredIds.push(msg.id);
			}
		}

		// Mark messages as delivered so they won't be re-sent on next connection
		await messageStore.markDelivered(deliveredIds);
	} catch (error) {
		// Log error but don't fail connection if we can't fetch messages
		console.error("Failed to fetch undelivered messages:", error);
	}
};
