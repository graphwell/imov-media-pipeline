FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS development
COPY apps/importer/package.json ./
RUN pnpm install
COPY apps/importer/ .
COPY apps/api/prisma ./prisma
RUN npx prisma generate
CMD ["pnpm", "dev"]

FROM base AS builder
COPY apps/importer/package.json ./
RUN pnpm install --frozen-lockfile
COPY apps/importer/ .
COPY apps/api/prisma ./prisma
RUN npx prisma generate
RUN pnpm build

FROM base AS production
COPY apps/importer/package.json ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/worker.js"]
