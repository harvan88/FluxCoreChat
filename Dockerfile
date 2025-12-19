# FluxCore API Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Install dependencies
FROM oven/bun:1.1-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/adapters/package.json ./packages/adapters/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 2: Build
FROM oven/bun:1.1-alpine AS builder
WORKDIR /app

# Copy dependencies (Bun workspaces hoistea todo al root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Build (if needed)
# RUN bun run build

# Stage 3: Production
FROM oven/bun:1.1-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 fluxcore
RUN adduser --system --uid 1001 fluxcore

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/extensions ./extensions
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R fluxcore:fluxcore /app

# Switch to non-root user
USER fluxcore

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["bun", "run", "apps/api/src/server.ts"]
