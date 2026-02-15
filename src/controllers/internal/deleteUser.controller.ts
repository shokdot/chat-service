import { FastifyReply, FastifyRequest } from "fastify";
import deleteUserMessages from "../services/deleteUserMessages.service.js";

const deleteUserHandler = async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
        const { userId } = request.params;

        await deleteUserMessages(userId);

        return reply.status(200).send({
            status: 'success',
            message: 'User messages deleted successfully',
        });
    }
    catch (error: any) {
        return reply.status(500).send({
            status: 'error',
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error'
        });
    }
};

export default deleteUserHandler;
