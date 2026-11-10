FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Public URL of the app, baked into the build for the CSRF check (rebuild when it changes)
ARG ORIGIN=http://localhost:3000
RUN ORIGIN=$ORIGIN pnpm build && pnpm prune --prod

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
# Password tool (spec §4.10): docker compose exec app node --experimental-strip-types scripts/set-password.ts
COPY --from=build /app/scripts/set-password.ts ./scripts/
COPY --from=build /app/src/lib/server/auth.ts ./src/lib/server/
EXPOSE 3000
# Migrations and plant reference data are applied on startup (src/hooks.server.ts)
CMD ["node", "build"]
