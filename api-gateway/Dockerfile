FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY api-gateway/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY api-gateway/src ./src
EXPOSE 3000
CMD ["node", "src/server.js"]
