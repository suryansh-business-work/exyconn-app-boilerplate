# Build context is the repository root: docker build -f server/Dockerfile .

FROM node:24-alpine AS base
WORKDIR /repo
# The in-memory MongoDB used by tests must not be downloaded into the image.
ENV MONGOMS_DISABLE_POSTINSTALL=1
RUN npm install --global pnpm@12.11.2
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/common packages/common
COPY server/package.json server/package.json

FROM base AS build
RUN pnpm install --frozen-lockfile --filter server...
COPY server server
RUN pnpm --filter server build

FROM base AS runtime
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter server...
COPY --from=build /repo/server/dist server/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:4000/health || exit 1
CMD ["node", "server/dist/index.js"]
