FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/providers/package.json packages/providers/package.json
COPY packages/video-engine/package.json packages/video-engine/package.json
RUN pnpm install --frozen-lockfile
COPY . .
# Browser acessa a API pelo host publicado pelo compose (porta 8787), não por
# nome de serviço interno — front-end roda no navegador do usuário, não na rede Docker.
ARG VITE_API_URL=http://localhost:8787
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @clickplay/web build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
