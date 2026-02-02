FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package*.json ./

# Set up npm configuration once
RUN --mount=type=secret,id=NODE_AUTH_TOKEN sh -c \
    'npm config set //npm.pkg.github.com/:_authToken=$(cat /run/secrets/NODE_AUTH_TOKEN) && \
    npm config set @navikt:registry=https://npm.pkg.github.com && \
    npm ci'

FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/app/test/mocks ./app/test/mocks

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]

