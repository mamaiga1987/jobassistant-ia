FROM node:18-alpine
RUN apk add --no-cache poppler-utils chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN mkdir -p /app/uploads/cv
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 4003
CMD ["node", "server.js"]
