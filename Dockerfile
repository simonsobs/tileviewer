FROM node:latest AS build

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install

COPY ./ /app/

RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine

COPY --from=build /app/dist/ /usr/share/nginx/html

EXPOSE 8080

USER 1001