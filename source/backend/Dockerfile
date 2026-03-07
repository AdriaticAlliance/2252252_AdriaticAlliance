FROM node:20-alpine
WORKDIR /app

# Create data dir for SQLite volume
RUN mkdir -p /app/data

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# SQLite file persists via Docker volume
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["node", "src/index.js"]
