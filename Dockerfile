# --- Stage 1: Install dependencies ---
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# --- Stage 2: Production image ---
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json ./
COPY server.js ./
COPY src/ ./src/

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
