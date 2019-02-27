FROM node:10.14-alpine
COPY docker/install_chrome /app/install_chrome
RUN cd /app && ./install_chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
COPY package.json /app/package.json
RUN cd /app && npm install

WORKDIR /app