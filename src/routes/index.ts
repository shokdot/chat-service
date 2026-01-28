import { FastifyInstance } from "fastify";
import wsRoutes from "./ws.routes.js";

export default async function chatRoutes(app: FastifyInstance): Promise<void> {
	await app.register(wsRoutes);
}

