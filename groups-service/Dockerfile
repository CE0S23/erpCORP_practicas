FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY groups-service/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY groups-service/prisma ./prisma
COPY groups-service/src ./src
RUN npx prisma generate
EXPOSE 3002
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
