# Build stage
FROM node:24-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy the rest of the application files to the working directory
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Install dependencies and build
RUN pnpm install
RUN pnpm build

# Clean up
RUN pnpm prune --prod && pnpm store prune

# Production stage
FROM gcr.io/distroless/nodejs24-debian12

# Set the working directory
WORKDIR /usr/src/app

# Copy built node modules and compiled code
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./package.json

# Set the entry point
CMD ["node", "dist/src/main"]
