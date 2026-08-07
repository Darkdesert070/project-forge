# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Prisma links against OpenSSL to choose its engine. Without the package present
# the detection silently falls back to 1.1.x and resolves an engine filename
# that was never downloaded, so it must be installed in this stage too.
RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm ci
COPY backend .
RUN npx prisma generate && npm run build

# ---------- Runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl
RUN addgroup -S forge && adduser -S forge -G forge

# Ownership is set during the copy. The container runs unprivileged, and Prisma
# writes into node_modules if it ever has to resolve an engine at boot.
COPY --from=build --chown=forge:forge /app/node_modules ./node_modules
COPY --from=build --chown=forge:forge /app/dist ./dist
COPY --from=build --chown=forge:forge /app/prisma ./prisma
COPY --from=build --chown=forge:forge /app/package.json ./package.json

USER forge
EXPOSE 4000

# The local CLI is used rather than `npx`, which would otherwise reach for the
# registry at boot if resolution ever failed.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/server.js"]
