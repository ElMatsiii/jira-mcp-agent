# ==============================================================================
# jira-mcp-agent Multi-Stage Dockerfile
# Stage 1: Build TypeScript MCP Agent Application
# Stage 2: Minimal, Non-Root Node.js 20 Alpine Production Runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors first for layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for tsc)
RUN npm ci || npm install

# Copy source code and TypeScript configuration
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Production Environment Defaults
ENV NODE_ENV=production \
    PORT=3000 \
    GEMINI_MODEL=gemini-2.0-flash \
    OFFLINE_FALLBACK_ENABLED=true

# Install essential system packages
RUN apk add --no-cache ca-certificates tzdata

# Copy package descriptors
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Copy compiled JavaScript output from builder
COPY --from=builder /app/dist ./dist

# Set file ownership to built-in non-root node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose REST HTTP port (:3000)
EXPOSE 3000

# Healthcheck probe using node internal http client
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/healthz', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

# Launch production server
ENTRYPOINT ["node", "dist/index.js"]
