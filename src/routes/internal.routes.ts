import { FastifyInstance } from "fastify";
import deleteUserHandler from "../controllers/internal/deleteUser.controller.js";
import getConversationPartnersHandler from "../controllers/internal/getConversationPartners.controller.js";

export default async function internalRoutes(app: FastifyInstance): Promise<void> {
    app.delete("/:userId", deleteUserHandler);
    app.get("/:userId/conversation-partners", getConversationPartnersHandler);
}
