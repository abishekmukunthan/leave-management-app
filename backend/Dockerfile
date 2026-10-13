# ==============================================================================
# Production Dockerfile for Arogya Leave Management Backend (Express + Node.js)
# ==============================================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install curl / wget / ca-certificates for health checks
RUN apk --no-cache add ca-certificates wget

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production dependencies cleanly using npm ci
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY server.js ./
COPY src/ ./src/

# Change ownership to non-root node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose backend port
ENV PORT=5001
ENV NODE_ENV=production
EXPOSE 5001

# Health check against root health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/ || exit 1

# Start production server
CMD ["npm", "start"]
