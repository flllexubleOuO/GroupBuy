FROM node:20-slim AS build

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

# Install full deps (incl. dev) for TypeScript build
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# Copy source for build
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY tsconfig.json ./

# Prisma client + TS build
RUN npx prisma generate
RUN npm run build

# Prune dev deps for runtime
RUN npm prune --omit=dev

FROM node:20-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public

COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh && mkdir -p public/uploads logs

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]

