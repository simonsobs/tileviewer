FROM node:latest AS build

WORKDIR /app

COPY package.json /app/

RUN npm install

COPY ./ /app/

RUN npm run build

FROM nginx:latest

COPY --from=build /app/dist/ /usr/share/nginx/html