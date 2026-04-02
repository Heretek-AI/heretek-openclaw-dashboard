# ==============================================================================
# Heretek OpenClaw Dashboard - Dockerfile
# ==============================================================================
# Version: 1.0.0
# Last Updated: 2026-04-01
# ==============================================================================

FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling and wget for health checks
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser

# Copy source code
COPY --chown=appuser:appgroup dashboard/api/ ./api/
COPY --chown=appuser:appgroup dashboard/collectors/ ./collectors/
COPY --chown=appuser:appgroup dashboard/integrations/ ./integrations/
COPY --chown=appuser:appgroup dashboard/config/ ./config/

# Install production dependencies
RUN npm init -y && \
    npm install express ws js-yaml node-fetch && \
    npm cache clean --force

# Set environment variables
ENV NODE_ENV=production
ENV DASHBOARD_PORT=18790
ENV DASHBOARD_HOST=0.0.0.0
ENV HEALTH_API_PORT=8080
ENV HEALTH_API_HOST=0.0.0.0

# Expose ports
EXPOSE 18790 8080

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application with dual-port server
CMD ["dumb-init", "node", "api/health-api.js"]
