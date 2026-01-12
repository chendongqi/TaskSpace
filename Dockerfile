# Build stage
FROM node:18-alpine AS builder

WORKDIR /build

# Copy auth-sdk package (needed for file: dependency)
COPY ../../packages/auth-sdk ./packages/auth-sdk

# Copy taskspace app
COPY . .

# Install dependencies (npm will handle file: dependency automatically)
RUN npm install

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=builder /build/.next/standalone ./
COPY --from=builder /build/.next/static ./.next/static
COPY --from=builder /build/public ./public

# Create non-root user for security (use host user ID to avoid permission issues)
RUN addgroup -g 1000 -S appgroup || true
RUN adduser -S appuser -u 1000 -G appgroup || true

# Create data directory for backups
RUN mkdir -p /app/data/backups

# Change ownership of the app directory (except /app/data which will be mounted)
RUN chown -R 1000:1000 /app

USER 1000:1000

# Expose port 3000
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start the production server
CMD ["node", "server.js"]