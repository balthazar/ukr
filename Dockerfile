FROM node:24.19-alpine AS web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:24.19-alpine AS api
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24.19-alpine AS runtime
ENV NODE_ENV=production WEB_DIST=/app/web/dist
WORKDIR /app
COPY --from=api /app/api/node_modules ./api/node_modules
COPY api/package.json ./api/
COPY api/src ./api/src
COPY --from=web /app/web/dist ./web/dist
# words.json ships in the image so `kubectl exec deploy/ukr -- npm run seed` works.
COPY seed/out/words.json ./seed/out/words.json
WORKDIR /app/api
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
