import "dotenv/config";
import { FastifyInstance } from "fastify";
import { API_PREFIX, buildApp, startServer, healthRoutes } from "@core/index.js";
import chatRoutes from "src/routes/index.js";
import ws from "@fastify/websocket";
import { HOST, PORT, SERVICE_NAME } from "src/utils/env.js";

const app = buildApp(SERVICE_NAME);
// @ts-expect-error - Type mismatch due to monorepo having separate fastify type definitions
await app.register(ws);

async function registerRoutes(app: FastifyInstance) {
	// @ts-expect-error - Type mismatch due to monorepo having separate fastify type definitions
	await app.register(healthRoutes, { prefix: `${API_PREFIX}/chat` });
	await app.register(chatRoutes, { prefix: `${API_PREFIX}/chat` });
}

// @ts-expect-error - Type mismatch due to monorepo having separate fastify type definitions
startServer(app, registerRoutes, HOST, PORT, SERVICE_NAME);

