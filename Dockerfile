# =============================================================================
# DOCKERFILE ULTRA-OPTIMIZADO - FRONTEND ANGULAR
# Multi-stage build para máximo rendimiento y mínimo tamaño
# =============================================================================

# =============================================================================
# STAGE 1: Build Stage - Compilar la aplicación Angular
# =============================================================================
FROM node:22-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

RUN npm run build:prod

# =============================================================================
# STAGE 2: Runtime Stage - Nginx para servir archivos estáticos
# =============================================================================
FROM nginx:alpine AS production

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar los archivos construidos desde la etapa anterior
COPY --from=builder /app/dist/vg-web-sistemajass/browser /usr/share/nginx/html
# Exponer el puerto 80
EXPOSE 80

# Comando para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
