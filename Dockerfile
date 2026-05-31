# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Configure pnpm to allow build scripts for Prisma
RUN pnpm config set only-built-dependencies prisma,@prisma/engines,@prisma/client

# Copy package files
COPY package*.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN pnpm install

# Generate Prisma client
RUN pnpm exec prisma generate

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy built application and production dependencies
# We copy node_modules from builder for simplicity, 
# but in a more optimized setup we might do a separate pnpm install --prod
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/src/app.js"]
