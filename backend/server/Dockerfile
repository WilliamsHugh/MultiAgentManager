### Multi-stage build — Backend Server (Node.js/Express + better-sqlite3)
# Stage 1: build native deps (better-sqlite3 needs a toolchain)
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: runtime (non-root, minimal)
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/tasks.db
WORKDIR /app

RUN groupadd -g 10001 app && useradd -u 10001 -g app -m -s /usr/sbin/nologin app \
    && mkdir -p /data && chown -R app:app /data

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app . .

USER 10001:10001
EXPOSE 3001
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
