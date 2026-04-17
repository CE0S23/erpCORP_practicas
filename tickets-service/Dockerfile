FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY tickets-service/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY tickets-service/prisma ./prisma
COPY tickets-service/src ./src
RUN npx prisma generate
EXPOSE 3003
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
