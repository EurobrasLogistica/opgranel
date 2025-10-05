# Dockerfile.backend
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

ENV TZ=America/Sao_Paulo \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

# 1) Copia manifestos para aproveitar cache
COPY package*.json ./

# 2) Usa root só para instalar deps e ajustar permissão
USER 0
# npm ci = instala conforme package-lock.json
RUN npm ci --omit=dev && chown -R pptruser:pptruser /app

# 3) Volta para o usuário padrão da imagem
USER pptruser

# 4) Copia o restante do código
COPY --chown=pptruser:pptruser . .

EXPOSE 3009
CMD ["node", "index.js"]
