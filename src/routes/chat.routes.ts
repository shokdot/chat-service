import { FastifyInstance } from "fastify";
import { authenticate, AuthRequest, sendError, AppError, errorResponseSchema } from "@core/index.js";
import { messageStore } from "src/wsManager/messageStore.js";
import type { FastifyReply } from "fastify";

const getConversationsSchema = {
	preHandler: [authenticate],
	schema: {
		description: "Get list of conversations for the authenticated user",
		tags: ["Chat"],
		response: {
			200: {
				type: "object",
				properties: {
					status: { type: "string" },
					data: {
						type: "array",
						items: {
							type: "object",
							properties: {
								partnerId: { type: "string" },
								lastMessage: { type: "string" },
								lastMessageType: { type: "string" },
								lastMessageAt: { type: "string" },
								lastMessageFrom: { type: "string" },
							}
						}
					}
				}
			},
			401: errorResponseSchema,
			500: errorResponseSchema
		}
	}
};

const getConversationMessagesSchema = {
	preHandler: [authenticate],
	schema: {
		description: "Get message history with a specific user",
		tags: ["Chat"],
		params: {
			type: "object",
			properties: {
				userId: { type: "string" }
			},
			required: ["userId"]
		},
		querystring: {
			type: "object",
			properties: {
				limit: { type: "integer", minimum: 1, maximum: 200, default: 100 }
			}
		},
		response: {
			200: {
				type: "object",
				properties: {
					status: { type: "string" },
					data: {
						type: "array",
						items: {
							type: "object",
							properties: {
								type: { type: "string" },
								from: { type: "string" },
								to: { type: "string" },
								content: { type: "string" },
								sentAt: { type: "string" },
							}
						}
					}
				}
			},
			401: errorResponseSchema,
			500: errorResponseSchema
		}
	}
};

async function getConversationsHandler(request: AuthRequest, reply: FastifyReply) {
	try {
		const { userId } = request;
		if (!userId) {
			return sendError(reply, 401, "UNAUTHORIZED", "User not authenticated");
		}

		const conversations = await messageStore.getConversations(userId);

		return reply.status(200).send({
			status: "success",
			data: conversations,
		});
	} catch (error: unknown) {
		if (error instanceof AppError) {
			return sendError(reply, error);
		}
		return sendError(reply, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
	}
}

async function getConversationMessagesHandler(
	request: AuthRequest<unknown, { limit?: number }, { userId: string }>,
	reply: FastifyReply
) {
	try {
		const { userId } = request;
		if (!userId) {
			return sendError(reply, 401, "UNAUTHORIZED", "User not authenticated");
		}

		const { userId: partnerId } = request.params;
		const limit = (request.query as { limit?: number })?.limit ?? 100;

		const messages = await messageStore.getConversation(userId, partnerId, limit);

		return reply.status(200).send({
			status: "success",
			data: messages,
		});
	} catch (error: unknown) {
		if (error instanceof AppError) {
			return sendError(reply, error);
		}
		return sendError(reply, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
	}
}

const deleteConversationSchema = {
	preHandler: [authenticate],
	schema: {
		description: "Delete all messages in a conversation with a specific user",
		tags: ["Chat"],
		params: {
			type: "object",
			properties: {
				userId: { type: "string" }
			},
			required: ["userId"]
		},
		response: {
			200: {
				type: "object",
				properties: {
					status: { type: "string" },
					message: { type: "string" },
				}
			},
			401: errorResponseSchema,
			500: errorResponseSchema
		}
	}
};

async function deleteConversationHandler(
	request: AuthRequest<unknown, unknown, { userId: string }>,
	reply: FastifyReply
) {
	try {
		const { userId } = request;
		if (!userId) {
			return sendError(reply, 401, "UNAUTHORIZED", "User not authenticated");
		}

		const { userId: partnerId } = request.params;
		await messageStore.deleteConversation(userId, partnerId);

		return reply.status(200).send({
			status: "success",
			message: "Conversation deleted",
		});
	} catch (error: unknown) {
		if (error instanceof AppError) {
			return sendError(reply, error);
		}
		return sendError(reply, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
	}
}

export default async function chatHttpRoutes(app: FastifyInstance): Promise<void> {
	app.get("/conversations", getConversationsSchema, getConversationsHandler);
	app.get("/conversations/:userId", getConversationMessagesSchema, getConversationMessagesHandler);
	app.delete("/conversations/:userId", deleteConversationSchema, deleteConversationHandler);
}
