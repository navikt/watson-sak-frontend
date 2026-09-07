FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-dev AS dependencies
# Chainguard-imaget kjører som nonroot som standard, og corepack må skrive til
# /usr/bin. Kun i denne (kasserte) byggefasen — sluttimaget forblir nonroot.
USER root
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./

RUN corepack enable && corepack prepare --activate
RUN --mount=type=secret,id=NODE_AUTH_TOKEN sh -c \
    'echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/NODE_AUTH_TOKEN)" >> .npmrc && \
    pnpm install --frozen-lockfile && \
    sed -i "/npm.pkg.github.com\/:_authToken/d" .npmrc'

# Sluttimaget skal bare ha runtime-avhengigheter. devDependencies drar med seg
# native binærfiler (esbuild er skrevet i Go), og de dukker opp som golang/stdlib-
# sårbarheter i imagescanningen selv om de aldri kjøres i produksjon.
# Bygger videre på dependencies-steget slik at pnpm-storen er intakt — da trenger
# prune verken nettverk eller token.
FROM dependencies AS prod-dependencies
RUN pnpm prune --prod

FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-dev AS builder
USER root
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN corepack enable && corepack prepare --activate
RUN pnpm run build

FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-slim
WORKDIR /app
COPY package.json ./
COPY --from=prod-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

# Chainguard-imaget kjører som nonroot-bruker som standard, og Nais overstyrer
# uansett kjørebruker til 1069 (se https://sikkerhet.nav.no/docs/sikker-utvikling/baseimages)
ENV NODE_ENV=production
EXPOSE 3000
# Chainguards node-image bruker /usr/bin/node som ENTRYPOINT (ikke shell), så CMD
# sendes rett til node. node_modules/.bin/react-router-serve er en sh-shim, ikke
# JS — pek derfor direkte på den ekte bin-filen i pakken.
CMD ["./node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]

