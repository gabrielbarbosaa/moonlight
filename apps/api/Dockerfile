FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV HUSKY=0 CI=true
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/schemas/package.json packages/schemas/package.json
COPY packages/renderer/package.json packages/renderer/package.json
RUN pnpm install --frozen-lockfile --filter api...
COPY packages/schemas packages/schemas
COPY apps/api apps/api
RUN pnpm --filter @moonlight/schemas build && pnpm --filter api build
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.scripts.prepare;fs.writeFileSync('package.json',JSON.stringify(p))" \
  && rm -rf node_modules apps/api/node_modules packages/schemas/node_modules \
  && pnpm install --prod --frozen-lockfile --filter api... \
  && pnpm --filter api exec prisma generate

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
RUN mkdir -p /data/media && chown -R node:node /data
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "run", "start:prod"]
