# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# GitHub Packages read token for @system-b90/* arrives as a BuildKit secret
# (`npm_token`), never as ARG/ENV, so it can't land in image config, layers or
# provenance. .npmrc resolves ${NPM_TOKEN} from the env of this one command.
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm     --mount=type=secret,id=npm_token     NPM_TOKEN="$(cat /run/secrets/npm_token)" npm ci --ignore-scripts

# Hot-reload target for `npm run docker:dev`: full deps + source, Next dev server.
# Source is kept fresh by `docker compose watch` (see deploy/docker-compose.dev.yml).
FROM deps AS dev
WORKDIR /app
COPY . .
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "next:dev"]

FROM node:22-alpine AS builder
WORKDIR /app

# Define ARGs to satisfy the compiler's assertions
ARG WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY=ci_placeholder
ARG WEBSOCKET_SESSION_SERVER_HOST=localhost
ARG WEBSOCKET_SESSION_SERVER_PORT=443
ARG NEXTAUTH_SECRET=ci_build_placeholder

# Map ARGs to ENVs for the 'npm run build' process
ENV WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY=$WEBSOCKET_SESSION_SERVER_SENDER_AUTH_KEY
ENV WEBSOCKET_SESSION_SERVER_HOST=$WEBSOCKET_SESSION_SERVER_HOST
ENV WEBSOCKET_SESSION_SERVER_PORT=$WEBSOCKET_SESSION_SERVER_PORT
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
