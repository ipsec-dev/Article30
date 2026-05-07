# syntax=docker/dockerfile:1.7

# --- deps: install workspace deps once, build shared package ---
FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS deps
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY shared/package.json ./shared/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile
COPY shared/ ./shared/
RUN pnpm --filter @article30/shared build

# --- dev: hot reload via next dev ---
FROM deps AS dev
COPY frontend/ ./frontend/
WORKDIR /app/frontend
EXPOSE 3000
CMD ["pnpm", "dev"]

# --- build: produces the prod artifact ---
FROM deps AS build
COPY frontend/ ./frontend/
ARG BACKEND_URL=http://backend:3001
ENV BACKEND_URL=${BACKEND_URL}
ENV NEXT_OUTPUT=standalone
RUN pnpm --filter @article30/frontend build

# --- prod: runtime image ---
FROM node:24-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f AS prod
WORKDIR /app
COPY --chown=node:node --from=build /app/frontend/.next/standalone ./
COPY --chown=node:node --from=build /app/frontend/.next/static ./frontend/.next/static
COPY --chown=node:node --from=build /app/frontend/public ./frontend/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000 > /dev/null 2>&1 || exit 1
CMD ["node", "frontend/server.js"]
