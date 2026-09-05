# Étape 1 : Compilation de l'application React + Vite
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Étape 2 : Serveur web Nginx ultra-léger (~25 Mo)
FROM nginx:alpine

# Copie des fichiers compilés de production
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration Nginx optimisée pour SPA (Single Page Application)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
