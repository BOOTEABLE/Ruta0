# 1. Imagen base: Usamos la versión Alpine de Node (súper ligera, pesa como 50MB en vez de 1GB)
FROM node:22-alpine

# 2. Directorio de trabajo: Creamos una carpeta dentro del contenedor donde vivirá tu app
WORKDIR /app

# 3. Caché de dependencias: Copiamos PRIMERO solo el package.json
# Esto es un truco de ingeniería: Docker guarda esta capa en caché. 
# Si luego solo cambias tu código (index.js), Docker no volverá a descargar todo npm install.
COPY package*.json ./

# 4. Instalación: Descargamos las librerías (Express, Gemini, pg, etc.)
RUN npm install --omit=dev

# 5. Código fuente: Ahora sí, copiamos el resto de tus carpetas (src, index.js)
COPY . .

# 6. Puerto: Le avisamos a Docker qué puerto usa tu index.js
EXPOSE 3000

# 7. Arranque: El comando que levanta tu servidor
CMD ["node", "index.js"]