import { WebSocket, RawData } from "ws";
import { FastifyRequest } from "fastify";
import { checkBlocked } from "@core/index.js";
import { chatConnections } from "src/wsManager/chatConnections.js";
import { messageStore } from "src/wsManager/messageStore.js";
import type { IncomingChatMessage, OutgoingMessage } from "src/types/message.js";
import { isValidIncomingMessage } from "src/utils/validation.js";
import { createErrorMessage, ERROR_CODES } from "../utils/errorMessages.js";
import {
	sendChatNotification,
	sendGameInviteNotification
} from "src/services/notification.service.js";

export const handleMessage = async (
	raw: RawData,
	userId: string | undefined,
	ws: WebSocket,
	request: FastifyRequest
): Promise<void> => {
	let parsed: unknown;

	try {
		const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
		parsed = JSON.parse(buffer.toString());
	} catch {
		ws.send(JSON.stringify(createErrorMessage(ERROR_CODES.INVALID_JSON, "Invalid JSON payload")));
		return;
	}

	if (!isValidIncomingMessage(parsed)) {
		ws.send(
			JSON.stringify(createErrorMessage(ERROR_CODES.INVALID_PAYLOAD, "Invalid message structure"))
		);
		return;
	}

	const message = parsed as IncomingChatMessage;

	// Do not allow sending messages without an authenticated user
	if (!userId) {
		ws.send(
			JSON.stringify(createErrorMessage(ERROR_CODES.UNAUTHENTICATED, "User is not authenticated"))
		);
		return;
	}

	try {
		const isBlocked = await checkBlocked(userId, message.to);

		if (isBlocked) {
			ws.send(
				JSON.stringify(
					createErrorMessage(ERROR_CODES.USER_BLOCKED, "You cannot communicate with this user")
				)
			);
			return;
		}

		const timestamp = new Date().toISOString();

		if (message.type === "CHAT") {
			const outgoing: OutgoingMessage = {
				type: "CHAT",
				from: userId,
				content: message.content,
				sentAt: timestamp
			};

			// Always store message in DB, even if receiver is offline
			await messageStore.add({
				type: "CHAT",
				from: userId,
				to: message.to,
				content: message.content,
				sentAt: timestamp
			});

			// Try to deliver if receiver is online
			chatConnections.send(message.to, outgoing);

			// Send notification to indicate unread message from sender
			// Notification helps show unread message indicators
			await sendChatNotification(message.to, userId);
		} else if (message.type === "GAME_INVITE") {
			const outgoing: OutgoingMessage = {
				type: "GAME_INVITE",
				from: userId,
				payload: message.payload,
				sentAt: timestamp
			};

			// Always store message in DB, even if receiver is offline
			await messageStore.add({
				type: "GAME_INVITE",
				from: userId,
				to: message.to,
				payload: message.payload,
				sentAt: timestamp
			});

			// Try to deliver if receiver is online
			chatConnections.send(message.to, outgoing);

			// Send notification for game invite
			await sendGameInviteNotification(message.to, userId);
		}
	} catch (error) {
		// If user-service or checkBlocked fails, surface a generic error
		ws.send(
			JSON.stringify(
				createErrorMessage(ERROR_CODES.INTERNAL_ERROR, "Unable to process message at this time")
			)
		);

		request.log.error(
			{
				userId,
				target: message.to,
				type: message.type,
				error: error instanceof Error ? error.message : String(error)
			},
			"chat_ws_error"
		);
	}
};
