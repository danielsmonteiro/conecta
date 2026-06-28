# syntax=docker/dockerfile:1
# Multi-stage: target `development` (watch) e `production` (build enxuto).

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl tzdata
COPY package*.json ./
COPY prisma ./prisma

# ----------------------------- Desenvolvimento ---------------------------
FROM base AS development
ENV NODE_ENV=development
RUN npm install
RUN npx prisma generate
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# -------------------------------- Build ----------------------------------
FROM base AS build
RUN npm install
COPY . .
RUN npx prisma generate && npm run build

# ------------------------------- Produção --------------------------------
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl tzdata
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
# node_modules do build já tem o Prisma Client gerado + a CLI para migrar.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
