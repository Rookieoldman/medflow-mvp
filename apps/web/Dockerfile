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

EXPOSE 3000
CMD ["npm", "run", "dev"]