FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* bunfig.toml ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["sh", "-c", "NODE_TLS_REJECT_UNAUTHORIZED=0 bun run start"]
