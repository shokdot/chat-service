import type { OutgoingMessage } from "../../types/message.js";

export const createErrorMessage = (
	code: string,
	message: string
): OutgoingMessage => ({
	type: "ERROR",
	code,
	message
});

export const ERROR_CODES = {
	INVALID_JSON: "INVALID_JSON",
	INVALID_PAYLOAD: "INVALID_PAYLOAD",
	UNAUTHENTICATED: "UNAUTHENTICATED",
	USER_BLOCKED: "USER_BLOCKED",
	INTERNAL_ERROR: "INTERNAL_ERROR"
} as const;
