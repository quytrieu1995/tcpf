FROM node:18-alpine AS builder

WORKDIR /app

# Configure npm for better network handling
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

COPY package*.json ./

# Use npm ci for faster, more reliable builds
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Verify xlsx is installed and reinstall if needed
RUN npm list xlsx || npm install xlsx@^0.18.5 --legacy-peer-deps --save

COPY . .

# Double check xlsx is available before build
RUN ls -la node_modules/xlsx 2>/dev/null || npm install xlsx@^0.18.5 --legacy-peer-deps

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

