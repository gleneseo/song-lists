# syntax=docker/dockerfile:1

# Build context is the repository root (see the docker:build script), so this
# image is built with `docker build <repo-root> --file apps/cli/Dockerfile`.

ARG NODE_VERSION=24.19.0-slim
ARG NPM_VERSION=12.0.2

FROM node:${NODE_VERSION} AS base
ARG NPM_VERSION
RUN npm install -g npm@${NPM_VERSION}
WORKDIR /app

FROM base AS build
COPY . .
RUN npm ci
RUN npm run build:tsc --workspace @song-lists/cli

FROM base AS prod-deps
COPY . .
RUN npm ci --omit=dev --ignore-scripts

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY apps/cli/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/cli/dist/src ./dist
USER node
ENTRYPOINT ["node", "--enable-source-maps", "dist/index.js"]
