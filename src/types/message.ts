export type ChatMessageBase = {
	type: "CHAT" | "GAME_INVITE";
	to: string;
};

export type IncomingChatMessage =
	| (ChatMessageBase & {
		type: "CHAT";
		content: string;
	})
	| (ChatMessageBase & {
		type: "GAME_INVITE";
		payload: Record<string, unknown>;
	});

export type OutgoingMessage =
	| {
		type: "CHAT";
		from: string;
		content: string;
		sentAt: string;
	}
	| {
		type: "GAME_INVITE";
		from: string;
		payload: Record<string, unknown>;
		sentAt: string;
	}
	| {
		type: "ERROR";
		code: string;
		message: string;
	};

export type StoredMessage =
	| {
		type: "CHAT";
		from: string;
		to: string;
		content: string;
		sentAt: string;
	}
	| {
		type: "GAME_INVITE";
		from: string;
		to: string;
		payload: Record<string, unknown>;
		sentAt: string;
	};
