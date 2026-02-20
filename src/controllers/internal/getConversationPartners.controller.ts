import { FastifyReply, FastifyRequest } from "fastify";
import { messageStore } from "../../wsManager/messageStore.js";

const getConversationPartnersHandler = async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
) => {
    try {
        const { userId } = request.params;
        const conversations = await messageStore.getConversations(userId);
        const partnerIds = conversations.map((c) => c.partnerId);

        return reply.status(200).send({
            status: "success",
            data: { partnerIds },
        });
    } catch (error: any) {
        return reply.status(500).send({
            status: "error",
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
        });
    }
};

export default getConversationPartnersHandler;
