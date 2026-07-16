# ==========================================
# ETAPA 1: Compilación (Build)
# ==========================================
FROM node:22-alpine AS build

WORKDIR /app

# Copiamos package.json e instalamos dependencias
COPY package*.json ./
RUN npm install

# Copiamos el resto del código y compilamos la aplicación
COPY . .
RUN npm run build

# ==========================================
# ETAPA 2: Servidor Web Ligero (Nginx)
# ==========================================
FROM nginx:alpine

# Copiamos los archivos compilados de la Etapa 1 a Nginx.
# Nota: Desde Angular 17+, la salida por defecto incluye una subcarpeta 'browser'
COPY --from=build /app/dist/ruta-cero-front/browser /usr/share/nginx/html

# Exponemos el puerto 80 (el estándar de Nginx)
EXPOSE 80

# Arrancamos Nginx
CMD ["nginx", "-g", "daemon off;"]