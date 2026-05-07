# syntax=docker/dockerfile:1.7

# --- deps: install workspace deps once, build shared package ---
FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY shared/package.json ./shared/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile
COPY shared/ ./shared/
RUN pnpm --filter @article30/shared build

# --- dev: bind-mount-friendly target for hot reload ---
FROM deps AS dev
COPY backend/ ./backend/
WORKDIR /app/backend
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder npx prisma generate
EXPOSE 3001
CMD ["pnpm", "dev"]

# --- build: produces the prod artifact ---
FROM deps AS build
COPY backend/ ./backend/
WORKDIR /app/backend
# Prisma 7's prisma.config.ts requires DATABASE_URL at generate time even
# though generate doesn't connect — placeholder for the build layer only.
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder npx prisma generate
WORKDIR /app
RUN pnpm --filter @article30/backend build

# --- prod: runtime image ---
FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS prod
RUN corepack enable
WORKDIR /app
COPY --chown=node:node --from=build /app ./
USER node
EXPOSE 3001
WORKDIR /app/backend
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3001/health > /dev/null 2>&1 || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main"]
