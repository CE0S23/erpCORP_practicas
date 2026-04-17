FROM node:20-alpine
RUN echo "Cache bust: 20260417v2"
ARG CACHEBUST=20260417v2
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
RUN ls -la dist/ && ls -la dist/src/ || echo "ERROR: dist structure unexpected"
RUN npm prune --production
EXPOSE 3001
ENTRYPOINT ["sh", "-c"]
CMD ["echo '=== STARTING ===' && ls /app/dist/ && ls /app/dist/src/ && npx prisma migrate deploy && node /app/dist/src/main.js"]
