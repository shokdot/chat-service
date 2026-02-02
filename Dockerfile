FROM node:20 AS builder

WORKDIR /apps

COPY core/package*.json core/
COPY core/tsconfig.json core/
COPY core/src core/src

WORKDIR /apps/core
RUN npm install && npm run build

WORKDIR /apps

COPY chat-service/package*.json chat-service/
COPY chat-service/tsconfig.json chat-service/
COPY chat-service/tsup.config.ts chat-service/
COPY chat-service/src chat-service/src
COPY chat-service/prisma chat-service/prisma
COPY chat-service/prisma.config.ts chat-service/

WORKDIR /apps/chat-service

RUN npm install
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /apps

COPY --from=builder /apps/core/dist core/dist
COPY --from=builder /apps/chat-service/dist chat-service/dist
COPY --from=builder /apps/chat-service/package*.json chat-service/
COPY --from=builder /apps/chat-service/prisma chat-service/prisma
COPY --from=builder /apps/chat-service/prisma.config.ts chat-service/

WORKDIR /apps/chat-service

RUN npm install --omit=dev

EXPOSE 3005

CMD ["npm", "run", "start"]
