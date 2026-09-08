FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci --ignore-scripts && npm run build -w @centerfuse/config && npm run build -w @centerfuse/auth && npm run build -w @centerfuse/platform && npm run build -w @centerfuse/buyfuse-domain && npm run build -w @centerfuse/ui && npm run build -w @centerfuse/buyfuse
ENV NODE_ENV=production PORT=3002
EXPOSE 3002
USER node
CMD ["node","apps/buyfuse/dist/server.js"]
