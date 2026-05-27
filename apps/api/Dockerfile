FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS development
COPY package.json ./
RUN pnpm install
COPY . .
RUN pnpm prisma generate
EXPOSE 3001
CMD ["pnpm", "start:dev"]

FROM base AS builder
COPY package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS production
COPY package.json ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN pnpm prisma generate
EXPOSE 3001
CMD ["node", "dist/main"]
