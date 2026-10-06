FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN chmod +x entrypoint.sh && mkdir -p data

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
