FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY user-service/package*.json ./
RUN npm install --legacy-peer-deps
COPY user-service/tsconfig*.json ./
COPY user-service/nest-cli.json ./
COPY user-service/src ./src
COPY user-service/prisma ./prisma
RUN npx prisma generate
RUN ./node_modules/.bin/nest build
RUN npm prune --production
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
