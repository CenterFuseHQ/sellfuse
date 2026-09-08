FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --ignore-scripts && npm run build:packages && npm run build -w @sellfuse/ai-gateway-server

ENV NODE_ENV=production \
    AI_GATEWAY_HOST=0.0.0.0 \
    AI_GATEWAY_PORT=8787 \
    AI_PROVIDER=self_hosted \
    AI_RUNTIME=ollama \
    AI_BASE_URL=http://host.docker.internal:11434 \
    AI_TEXT_MODEL=qwen3:8b \
    AI_VISION_MODEL=gemma3:4b \
    AI_EMBEDDING_MODEL=embeddinggemma
EXPOSE 8787
USER node
CMD ["node", "apps/ai-gateway/dist/server.js"]
