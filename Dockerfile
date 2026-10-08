FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Crear admins dentro del contenedor: docker compose exec portal node scripts/create-admin.mjs ...
COPY --from=build /app/scripts ./scripts
RUN mkdir -p /data/apps /data/envArch && chown -R node:node /data /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
