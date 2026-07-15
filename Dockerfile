FROM oven/bun:latest AS builder
WORKDIR /app

COPY package.json bun.lockb* bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run lint

RUN bun run scripts/build-standalone.ts

FROM debian:stable-slim
WORKDIR /app

COPY --from=builder /app/dist/minecraft-server-manager /app/minecraft-server-manager

ENV NODE_ENV=production

EXPOSE 3000

CMD ["/app/minecraft-server-manager"]
