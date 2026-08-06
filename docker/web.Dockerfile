FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache gettext
COPY docker/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker/web-entrypoint.sh /docker-entrypoint.d/99-forge.sh
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/99-forge.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.d/99-forge.sh"]
