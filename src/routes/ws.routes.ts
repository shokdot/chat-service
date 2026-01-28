import { FastifyInstance } from "fastify";
import { wsChatHandler } from "src/ws/index.js";

export default async function wsRoutes(app: FastifyInstance) {
	app.get("/ws", { websocket: true }, wsChatHandler);
}

