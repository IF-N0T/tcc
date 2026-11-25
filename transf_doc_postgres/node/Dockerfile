FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY upload.js ./
USER node
CMD ["node", "upload.js"]
