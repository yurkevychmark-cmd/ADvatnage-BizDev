# BizDev-слухач Telegram (таск 140108c8). node:22-alpine — уже є на сервері
# (Docker Hub там дає 429 на анонімні завантаження).
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
# Том /data (сесія Telegram, ключ застосунку, токен пульта) — лише для користувача node.
RUN mkdir -p /data && chown node:node /data && chmod 700 /data
USER node
ENV NODE_ENV=production
CMD ["node", "src/main.mjs"]
