import prisma from "../utils/prismaClient.js";
import type { Prisma } from "@prisma/client";
import type { StoredMessage } from "../types/message.js";

const DEFAULT_LIMIT = 100;

function conversationKey(a: string, b: string): string {
	return [a, b].sort().join(":");
}

class MessageStore {
	async add(msg: StoredMessage): Promise<void> {
		await prisma.message.create({
			data: {
				fromUserId: msg.from,
				toUserId: msg.to,
				type: msg.type,
				content: msg.type === "CHAT" ? msg.content : null,
				payload:
					msg.type === "GAME_INVITE"
						? ((msg as Extract<StoredMessage, { type: "GAME_INVITE" }>).payload as Prisma.JsonValue)
						: null,
				sentAt: new Date(msg.sentAt)
			}
		});
	}

	async getConversation(userId1: string, userId2: string, limit = DEFAULT_LIMIT): Promise<StoredMessage[]> {
		const key = conversationKey(userId1, userId2);
		const [a, b] = key.split(":");

		const rows = await prisma.message.findMany({
			where: {
				OR: [
					{ fromUserId: a, toUserId: b },
					{ fromUserId: b, toUserId: a }
				]
			},
			orderBy: {
				sentAt: "asc"
			},
			take: limit
		});

		const messages: StoredMessage[] = rows.map((row) => {
			if (row.type === "CHAT") {
				return {
					type: "CHAT",
					from: row.fromUserId,
					to: row.toUserId,
					content: row.content ?? "",
					sentAt: row.sentAt.toISOString()
				};
			}

			return {
				type: "GAME_INVITE",
				from: row.fromUserId,
				to: row.toUserId,
				payload: (row.payload ?? {}) as Record<string, unknown>,
				sentAt: row.sentAt.toISOString()
			};
		});

		return messages;
	}

	async getUndeliveredMessages(userId: string, sinceDays = 7, limit = 100): Promise<StoredMessage[]> {
		const sinceDate = new Date();
		sinceDate.setDate(sinceDate.getDate() - sinceDays);

		const rows = await prisma.message.findMany({
			where: {
				toUserId: userId,
				sentAt: {
					gte: sinceDate
				}
			},
			orderBy: {
				sentAt: "asc"
			},
			take: limit
		});

		const messages: StoredMessage[] = rows.map((row) => {
			if (row.type === "CHAT") {
				return {
					type: "CHAT",
					from: row.fromUserId,
					to: row.toUserId,
					content: row.content ?? "",
					sentAt: row.sentAt.toISOString()
				};
			}

			return {
				type: "GAME_INVITE",
				from: row.fromUserId,
				to: row.toUserId,
				payload: (row.payload ?? {}) as Record<string, unknown>,
				sentAt: row.sentAt.toISOString()
			};
		});

		return messages;
	}
}

export const messageStore = new MessageStore();
