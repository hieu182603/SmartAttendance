# Multi-stage build để tối ưu kích thước image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install all dependencies (không dùng --production để đảm bảo không thiếu package)
# Ưu tiên npm nếu có package-lock.json, nếu không thì dùng yarn
RUN if [ -f package-lock.json ]; then \
  npm ci; \
  elif [ -f yarn.lock ]; then \
  apk add --no-cache yarn && \
  yarn install --frozen-lockfile && \
  yarn cache clean; \
  else \
  npm install; \
  fi

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Copy dependencies from builder (bao gồm tất cả dependencies, không chỉ production)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port (Fly.io sẽ override với PORT env var)
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/index.js"]

