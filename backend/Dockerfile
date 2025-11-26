FROM node:18-alpine

WORKDIR /app

# Configure npm for better network handling
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

COPY package*.json ./
RUN npm install --production --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]

