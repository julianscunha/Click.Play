FROM node:22-bookworm-slim AS base
# Libs exigidas pelo Chrome Headless Shell que @remotion/renderer baixa/usa em runtime
# (lista oficial Remotion pra Docker em Debian).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 libxrandr2 \
    libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 \
    libpango-1.0-0 libcairo2 libcups2 \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/providers/package.json packages/providers/package.json
COPY packages/video-engine/package.json packages/video-engine/package.json
RUN pnpm install --frozen-lockfile

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app /app
COPY . .
WORKDIR /app/apps/api
EXPOSE 8787
CMD ["pnpm", "start"]
