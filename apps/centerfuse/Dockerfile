FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm ci --ignore-scripts && npm run build -w @centerfuse/config && npm run build -w @centerfuse/ui && npm run build -w @centerfuse/home
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node","apps/centerfuse/dist/server.js"]
