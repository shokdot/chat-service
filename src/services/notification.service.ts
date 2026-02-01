import axios from "axios";
import { NOTIFICATION_SERVICE_URL, SERVICE_TOKEN } from "../utils/env.js";

export const sendChatNotification = async (
	userId: string,
	senderId: string
): Promise<void> => {
	try {
		await axios.post(
			`${NOTIFICATION_SERVICE_URL}/internal/`,
			{
				userId,
				type: "NEW_MESSAGE",
				message: JSON.stringify({
					from: senderId
				})
			},
			{
				headers: {
					"x-service-token": SERVICE_TOKEN
				}
			}
		);
	} catch (error) {
		// Log error but don't fail message sending if notification fails
		console.error("Failed to send chat notification:", error);
	}
};

export const sendGameInviteNotification = async (
	userId: string,
	senderId: string,
	invitationId?: string
): Promise<void> => {
	try {
		const message: { from: string; invitationId?: string } = { from: senderId };
		if (invitationId) message.invitationId = invitationId;

		await axios.post(
			`${NOTIFICATION_SERVICE_URL}/internal/`,
			{
				userId,
				type: "GAME_INVITE",
				message: JSON.stringify(message)
			},
			{
				headers: {
					"x-service-token": SERVICE_TOKEN
				}
			}
		);
	} catch (error) {
		// Log error but don't fail invite sending if notification fails
		console.error("Failed to send game invite notification:", error);
	}
};
