import type { IncomingChatMessage } from "../types/message.js";

export const isValidIncomingMessage = (data: unknown): data is IncomingChatMessage => {
	if (typeof data !== "object" || data === null) return false;

	const msg = data as Partial<IncomingChatMessage>;

	if (msg.type !== "CHAT" && msg.type !== "GAME_INVITE") return false;
	if (typeof msg.to !== "string" || msg.to.length === 0) return false;

	if (msg.type === "CHAT") {
		return typeof (msg as any).content === "string" && (msg as any).content.length > 0;
	}

	if (msg.type === "GAME_INVITE") {
		return typeof (msg as any).payload === "object" && (msg as any).payload !== null;
	}

	return false;
};
