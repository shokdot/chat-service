import { FastifyInstance } from "fastify";
import wsRoutes from "./ws.routes.js";
import invitationCreatedSchema from "src/invitation/invitationCreated.schema.js";
import invitationCreatedHandler from "src/invitation/invitationCreated.controller.js";

export default async function chatRoutes(app: FastifyInstance): Promise<void> {
	await app.register(wsRoutes);
	app.post("/internal/invitation-created", invitationCreatedSchema, invitationCreatedHandler);
}

