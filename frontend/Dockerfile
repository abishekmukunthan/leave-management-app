# ==============================================================================
# Multi-stage Dockerfile for Arogya Leave Management Frontend (React + Vite + Nginx)
# ==============================================================================

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies using clean install
RUN npm ci

# Copy application source files
COPY . ./

# Build arguments for Vite environment variables
ARG VITE_API_URL=http://localhost:5001/api
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_SHOW_DEMO_CREDENTIALS=false
ENV VITE_SHOW_DEMO_CREDENTIALS=$VITE_SHOW_DEMO_CREDENTIALS

# Build production bundle
RUN npm run build

# Stage 2: Serve production assets via Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is serving index.html (use 127.0.0.1 to avoid IPv6 [::1] connection refused)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
