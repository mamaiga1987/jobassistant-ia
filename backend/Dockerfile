FROM node:18-alpine
RUN apk add --no-cache poppler-utils
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 4003
CMD ["node", "server.js"]
