ARG BUILD_IMAGE=node:25.8.1-slim
ARG PROD_IMAGE=node:25.8.1-alpine

FROM ${BUILD_IMAGE} AS base
WORKDIR /app
RUN npm i -g pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm fetch

FROM deps AS builder
ARG RETROASSEMBLY_BUILD_TIME_VITE_VERSION
ENV RETROASSEMBLY_BUILD_TIME_VITE_VERSION=$RETROASSEMBLY_BUILD_TIME_VITE_VERSION
# Base path for subpath hosting (e.g. /retro). Baked into client asset URLs and the router at build
# time, so it must be supplied as a build arg; it is re-exported below for the runtime server.
ARG RETROASSEMBLY_RUN_TIME_BASE_URL=
ENV RETROASSEMBLY_RUN_TIME_BASE_URL=$RETROASSEMBLY_RUN_TIME_BASE_URL
ENV SKIP_INSTALL_SIMPLE_GIT_HOOKS=true
COPY . .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm i
RUN node --run=build

FROM ${PROD_IMAGE} AS deps-production
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm i --prod

FROM ${PROD_IMAGE} AS production
WORKDIR /app
# Re-declare so the server sees the same base path at runtime that was baked into the assets.
ARG RETROASSEMBLY_RUN_TIME_BASE_URL=
ENV RETROASSEMBLY_RUN_TIME_BASE_URL=$RETROASSEMBLY_RUN_TIME_BASE_URL
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/databases ./src/databases
COPY --from=builder /app/dist/client ./dist/client
COPY --from=builder /app/dist/server ./dist/server
COPY --from=deps-production /app/node_modules ./node_modules

VOLUME ["/app/data", "/app/roms"]
EXPOSE 8000
CMD ["node", "--run=start"]
