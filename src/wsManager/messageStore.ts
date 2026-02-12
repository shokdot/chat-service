import prisma from "../utils/prismaClient.js";
import type { Prisma } from "@prisma/client";
import type { StoredMessage } from "../types/message.js";

const DEFAULT_LIMIT = 100;

function conversationKey(a: string, b: string): string {
	return [a, b].sort().join(":");
}

class MessageStore {
	async add(msg: StoredMessage): Promise<string> {
		const record = await prisma.message.create({
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
		return record.id;
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

	async getConversations(userId: string): Promise<{
		partnerId: string;
		lastMessage: string;
		lastMessageType: string;
		lastMessageAt: string;
		lastMessageFrom: string;
	}[]> {
		// Get all messages where user is sender or receiver
		const rows = await prisma.message.findMany({
			where: {
				OR: [
					{ fromUserId: userId },
					{ toUserId: userId }
				]
			},
			orderBy: {
				sentAt: "desc"
			}
		});

		// Group by conversation partner, keep only the latest message per partner
		const partnerMap = new Map<string, {
			partnerId: string;
			lastMessage: string;
			lastMessageType: string;
			lastMessageAt: string;
			lastMessageFrom: string;
		}>();

		for (const row of rows) {
			const partnerId = row.fromUserId === userId ? row.toUserId : row.fromUserId;

			if (!partnerMap.has(partnerId)) {
				partnerMap.set(partnerId, {
					partnerId,
					lastMessage: row.content ?? "",
					lastMessageType: row.type,
					lastMessageAt: row.sentAt.toISOString(),
					lastMessageFrom: row.fromUserId,
				});
			}
		}

		// Return sorted by most recent
		return Array.from(partnerMap.values()).sort(
			(a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
		);
	}

	async getUndeliveredMessages(userId: string, sinceDays = 7, limit = 100): Promise<(StoredMessage & { id: string })[]> {
		const sinceDate = new Date();
		sinceDate.setDate(sinceDate.getDate() - sinceDays);

		const rows = await prisma.message.findMany({
			where: {
				toUserId: userId,
				deliveredAt: null,
				sentAt: {
					gte: sinceDate
				}
			},
			orderBy: {
				sentAt: "asc"
			},
			take: limit
		});

		const messages: (StoredMessage & { id: string })[] = rows.map((row) => {
			if (row.type === "CHAT") {
				return {
					id: row.id,
					type: "CHAT" as const,
					from: row.fromUserId,
					to: row.toUserId,
					content: row.content ?? "",
					sentAt: row.sentAt.toISOString()
				};
			}

			return {
				id: row.id,
				type: "GAME_INVITE" as const,
				from: row.fromUserId,
				to: row.toUserId,
				payload: (row.payload ?? {}) as Record<string, unknown>,
				sentAt: row.sentAt.toISOString()
			};
		});

		return messages;
	}

	async deleteConversation(userId: string, partnerId: string): Promise<number> {
		const result = await prisma.message.deleteMany({
			where: {
				OR: [
					{ fromUserId: userId, toUserId: partnerId },
					{ fromUserId: partnerId, toUserId: userId },
				],
			},
		});
		return result.count;
	}

	async markDelivered(messageIds: string[]): Promise<void> {
		if (messageIds.length === 0) return;

		await prisma.message.updateMany({
			where: {
				id: { in: messageIds }
			},
			data: {
				deliveredAt: new Date()
			}
		});
	}
}

export const messageStore = new MessageStore();
