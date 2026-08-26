# Stage 1: Base
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm i -g pnpm

WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 3: Development env
FROM deps AS development
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev"]

# Stage 4: Build production bundle
FROM deps AS builder
COPY . .
RUN pnpm build

# Stage 5: Serve production bundle with Nginx
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
# (Optional) If you use react-router or frontend routing, 
# you'll need to copy a custom nginx config mapping all paths to index.html.
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
