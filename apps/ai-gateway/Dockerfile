FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --ignore-scripts && npm run build:packages && npm run build -w @sellfuse/ai-gateway-server

ENV NODE_ENV=production
USER node
CMD ["node", "apps/ai-gateway/dist/server.js"]
