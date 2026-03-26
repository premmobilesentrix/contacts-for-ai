FROM node:22-slim AS builder

WORKDIR /app
COPY backend/package*.json ./

RUN npm install

COPY backend . 

RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app
COPY backend/sql /app/sql

EXPOSE 4000

CMD ["node", "dist/server.js"]
