FROM oven/bun:latest AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the frontend
RUN bun run build

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["bun", "run", "start"]
