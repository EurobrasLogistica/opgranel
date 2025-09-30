# Dockerfile.backend
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

ENV TZ=America/Sao_Paulo \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# copia apenas manifestos primeiro (se houver package-lock, ele vai junto)
COPY package*.json ./

# usa UID 0 só para instalar e ajustar permissão; evita o nome 'root'
USER 0
RUN npm install --omit=dev && chown -R pptruser:pptruser /app

# volta a rodar como o usuário padrão da imagem
USER pptruser

# copia o restante do código já com owner correto
COPY --chown=pptruser:pptruser . .

EXPOSE 3009
CMD ["node", "index.js"]
