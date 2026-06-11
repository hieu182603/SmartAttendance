# Monorepo-aware build for @smartattendance/backend.
# IMPORTANT: build context MUST be the repository ROOT (see docker-compose.yml),
# because the backend depends on the workspace package @smartattendance/shared
# (declared as "workspace:*") and is installed/built with pnpm — not npm.
#
#   docker build -f packages/backend/Dockerfile -t smartattendance-backend .
#
# --- Builder: install workspace deps + compile @smartattendance/shared ---
FROM node:20-alpine AS builder

RUN corepack enable
WORKDIR /app

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy source for the packages the backend actually needs.
# (apps/* and other packages are excluded via the root .dockerignore.)
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Install only the backend and its dependency graph (incl. shared).
# Frozen lockfile keeps builds reproducible.
RUN pnpm install --frozen-lockfile --filter "@smartattendance/backend..."

# Compile the shared TS package to dist/ (backend imports the built output).
RUN pnpm --filter @smartattendance/shared build

# --- Production image ---
FROM node:20-alpine

RUN apk add --no-cache dumb-init
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy the fully-installed workspace from the builder.
COPY --from=builder --chown=nodejs:nodejs /app ./

USER nodejs

# Fly.io / compose may override via PORT env var.
EXPOSE 4000

ENV NODE_ENV=production

# Health check hits the backend's own /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))" || exit 1

ENTRYPOINT ["dumb-init", "--"]

# Run from the backend package directory so its relative paths resolve.
WORKDIR /app/packages/backend
CMD ["node", "src/index.js"]
