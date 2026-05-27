FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS development
COPY package.json ./
RUN pnpm install
COPY . .
CMD ["pnpm", "dev"]

FROM base AS builder
COPY package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS production
COPY package.json ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/worker.js"]
