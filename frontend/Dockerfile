# syntax=docker/dockerfile:1
FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./

# ----------------------------- Desenvolvimento ---------------------------
FROM base AS development
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# -------------------------------- Build ----------------------------------
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install
COPY . .
RUN npm run build

# ------------------------------- Produção --------------------------------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
