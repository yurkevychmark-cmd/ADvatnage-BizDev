# BizDev-портал на нашому сервері: Astro SSR як окремий Node-сервер.
# node:22-alpine, бо в опублікованому node:20-alpine (20.20.2, npm 10.8.2) вбудований
# npm зламаний: обрізаний postcss-selector-parser → «_interopRequireDefault is not defined».
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
