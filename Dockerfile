# Dockerfile para BlackMamba Music Engine
# Build multi-stage para desarrollo y producción servida por Nginx

FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiesto de dependencias e instalar
COPY package*.json ./
RUN npm ci

# Copiar código fuente y construir estáticos
COPY . .
RUN npm run build

# Stage de producción
FROM nginx:alpine AS production

COPY --from=builder /app/dist/client /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
