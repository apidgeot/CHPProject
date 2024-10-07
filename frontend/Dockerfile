FROM node:alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY index.html .
COPY postcss.config.js .
COPY tailwind.config.js .
COPY tsconfig.json .
COPY tsconfig.node.json .
COPY vite.config.ts .
COPY src ./src
COPY .env .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html