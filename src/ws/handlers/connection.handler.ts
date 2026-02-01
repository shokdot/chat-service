import { WebSocket } from "ws";
import { FastifyRequest } from "fastify";
import { chatConnections } from "src/wsManager/chatConnections.js";
import { messageStore } from "src/wsManager/messageStore.js";
import type { OutgoingMessage } from "src/types/message.js";

export const handleClose = (userId: string | undefined): void => {
	if (userId) {
		chatConnections.remove(userId);
	}
};

export const handleError = (
	error: Error,
	userId: string | undefined,
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
		chatConnections.remove(userId);
	}
};

export const sendUndeliveredMessages = async (
	userId: string,
	ws: WebSocket
): Promise<void> => {
	try {
		const messages = await messageStore.getUndeliveredMessages(userId);

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
			}
		}
	} catch (error) {
		// Log error but don't fail connection if we can't fetch messages
		console.error("Failed to fetch undelivered messages:", error);
	}
};
