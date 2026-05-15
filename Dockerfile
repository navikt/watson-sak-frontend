FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./

RUN corepack enable && corepack prepare --activate
RUN --mount=type=secret,id=NODE_AUTH_TOKEN sh -c \
    'echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/NODE_AUTH_TOKEN)" >> .npmrc && \
    pnpm install --frozen-lockfile'

FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN corepack enable && corepack prepare --activate
RUN pnpm run build

FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

RUN addgroup -g 1069 watson && adduser -D -u 1069 -G watson watson
USER watson

ENV NODE_ENV=production
EXPOSE 3000
CMD ["./node_modules/.bin/react-router-serve", "./build/server/index.js"]

