import { RouteShorthandOptions } from "fastify";
import "@fastify/swagger";
import { errorResponseSchema, serviceAuth } from "@core/index.js";

const invitationCreatedSchema: RouteShorthandOptions = {
	preHandler: [serviceAuth as any],
	schema: {
		description: "Internal: persist and deliver GAME_INVITE when room-service creates an invitation",
		tags: ["Internal"],
		security: [{ serviceToken: [] }],
		body: {
			type: "object",
			required: ["invitationId", "inviterId", "inviteeId"],
			additionalProperties: false,
			properties: {
				invitationId: { type: "string", format: "uuid", description: "Invitation ID" },
				inviterId: { type: "string", format: "uuid", description: "User ID of the inviter" },
				inviteeId: { type: "string", format: "uuid", description: "User ID of the invitee" }
			}
		},
		response: {
			204: { type: "null" },
			400: errorResponseSchema,
			401: errorResponseSchema,
			403: errorResponseSchema,
			500: errorResponseSchema
		}
	}
};

export default invitationCreatedSchema;
