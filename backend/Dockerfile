FROM node:22-slim AS builder

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 4000

CMD ["node", "dist/server.js"]