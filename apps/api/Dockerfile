FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci --ignore-scripts && npm run build:packages && npm run build -w @sellfuse/api
ENV NODE_ENV=production API_PORT=4000
EXPOSE 4000
USER node
CMD ["node","apps/api/dist/server.js"]
