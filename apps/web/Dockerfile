FROM node:20-alpine

WORKDIR /app

# Dependencias
COPY package.json package-lock.json ./
RUN npm install

# Prisma (MUY IMPORTANTE)
COPY prisma ./prisma
RUN npx prisma generate

# Código (solo lo necesario)
COPY src ./src
COPY public ./public
COPY next.config.* ./
COPY tsconfig.json ./
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]