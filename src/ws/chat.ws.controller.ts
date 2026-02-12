import { FastifyRequest } from "fastify";
import { WebSocket } from "ws";
import { authenticateWs, AppError, wsAuthError } from "@core/index.js";
import { chatConnections } from "src/wsManager/chatConnections.js";
import { handleMessage } from "./handlers/message.handler.js";
import { handleClose, handleError, sendUndeliveredMessages } from "./handlers/connection.handler.js";

const wsChatHandler = async (ws: WebSocket, request: FastifyRequest) => {
	let userId: string | undefined;

	try {
		// Browser WebSocket API doesn't support custom headers,
		// so accept token from query param as fallback
		const url = new URL(request.url, `http://${request.headers.host}`);
		const queryToken = url.searchParams.get("token");
		const authHeader = request.headers["authorization"] || (queryToken ? `Bearer ${queryToken}` : undefined);

		const authResult = authenticateWs(authHeader, ws);
		userId = authResult.userId;

		chatConnections.add(userId, ws);

		// Send undelivered messages when user connects
		await sendUndeliveredMessages(userId, ws);

		ws.on("message", async (raw) => {
			await handleMessage(raw, userId, ws, request);
		});

		ws.on("close", () => {
			handleClose(userId);
		});

		ws.on("error", (error) => {
			handleError(error, userId, request);
		});
	} catch (error) {
		if (error instanceof AppError) {
			wsAuthError(error.code, ws);
		}

		ws.close(1011, "INTERNAL_SERVER_ERROR");
	}
};

export default wsChatHandler;

