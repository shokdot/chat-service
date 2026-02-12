import { FastifyRequest, FastifyReply } from "fastify";
import { chatConnections } from "src/wsManager/chatConnections.js";
import { messageStore } from "src/wsManager/messageStore.js";
import { sendGameInviteNotification } from "src/services/notification.service.js";
import type { InvitationCreatedBody } from "src/types/invitation.js";

const invitationCreatedHandler = async (request: FastifyRequest<{ Body: InvitationCreatedBody }>, reply: FastifyReply): Promise<void> => {
	const { invitationId, inviterId, inviteeId } = request.body;

	const timestamp = new Date().toISOString();
	const payload = { invitationId };

	const messageId = await messageStore.add({
		type: "GAME_INVITE",
		from: inviterId,
		to: inviteeId,
		payload,
		sentAt: timestamp
	});

	const outgoing = {
		type: "GAME_INVITE" as const,
		from: inviterId,
		payload,
		sentAt: timestamp
	};

	const delivered = chatConnections.send(inviteeId, outgoing);

	// Mark as delivered if sent in real-time
	if (delivered) {
		await messageStore.markDelivered([messageId]);
	}

	await sendGameInviteNotification(inviteeId, inviterId, invitationId);

	return reply.status(204).send();
}

export default invitationCreatedHandler;
