# ==========================================
# DOCKERFILE - ESCUELA PARA PADRES BACKEND
# ==========================================

# Usar imagen oficial de Node.js
FROM node:20-alpine AS base

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copiar archivos de configuración
COPY package*.json ./

# Instalar todas las dependencias (incluyendo dev para build)
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Generar clave de la aplicación si no existe
RUN npm run key:generate || echo "Key already exists"

# Construir el proyecto (ignorando errores de TypeScript)
RUN npm run build -- --ignore-ts-errors

# Exponer puerto
EXPOSE 3333

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar permisos de directorios
RUN chown -R nodejs:nodejs /app
USER nodejs

# Comando de inicio (usando archivo compilado)
CMD ["node", "build/bin/server.js"]
