FROM node:18-alpine AS builder
WORKDIR /app

# só os manifests p/ cache
COPY package*.json ./
RUN npm install --legacy-peer-deps

# resto do código do frontend
COPY . .
RUN npm run build -- --source-map=false

# stage de runtime estático com serve
FROM node:18-alpine
WORKDIR /app
RUN npm install --global serve
COPY --from=builder /app/build ./build
EXPOSE 3008
CMD ["serve", "-s", "build", "-l", "3008"]
