# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY user-service/package*.json ./
RUN npm install --legacy-peer-deps
COPY user-service/prisma ./prisma
COPY user-service/src ./src
COPY user-service/tsconfig*.json ./
COPY user-service/nest-cli.json ./
RUN npx prisma generate
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY user-service/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY user-service/prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
