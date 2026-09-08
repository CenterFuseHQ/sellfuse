FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci --ignore-scripts && npm run build -w @centerfuse/config && npm run build -w @centerfuse/ui && npm run build -w @sellfuse/web
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
EXPOSE 3001
USER node
CMD ["node","apps/web/dist/server.js"]
