FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DATA_DIR=/data
COPY --from=build /app/dist ./dist
COPY server/server.js ./server/server.js
COPY src/geojson.js ./src/geojson.js
COPY package.json ./package.json
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3001
CMD ["node", "server/server.js"]
