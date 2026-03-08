# Docker image for the MarsOperations ingestion "gate" component.
# Responsibilities:
#   - Communicate with the Mars simulator (HTTP REST + WebSocket).
#   - Poll /api/sensors and subscribe to /api/telemetry/ws.
#   - Forward raw sensor/telemetry payloads to the interpreter service,
#     which is the only component that talks to Kafka.

FROM node:20-alpine

WORKDIR /app

# Install dependencies first to leverage Docker build caching.
COPY package*.json ./

RUN npm ci --only=production || npm install --only=production

# Copy the gate-specific source code into the image.
COPY . .

ENV NODE_ENV=production \
    PORT=3001

EXPOSE 3001

# Assumes an npm script named "start:gate" that launches the gate process.
# Adjust this if the entrypoint differs.
CMD ["npm", "run", "start:gate"]

