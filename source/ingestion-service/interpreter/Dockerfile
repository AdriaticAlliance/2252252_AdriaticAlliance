# Docker image for the MarsOperations ingestion "interpreter" component.
# Responsibilities:
#   - Receive raw simulator data from the gate component.
#   - Transform payloads into the common data record format defined in ../../input.md.
#   - Validate against the common JSON schema and publish the translated
#     records to Kafka for downstream components.

FROM node:20-alpine

WORKDIR /app

# Install dependencies first to leverage Docker build caching.
COPY package*.json ./

RUN npm ci --only=production || npm install --only=production

# Copy the interpreter-specific source code into the image.
COPY . .

# Ensure a standard config directory exists; the common schema is mounted
# at runtime via a read-only volume (see docker-compose.yml).
RUN mkdir -p /app/config

ENV NODE_ENV=production \
    PORT=3002 \
    COMMON_SCHEMA_PATH=/app/config/common-data-record.schema.json

EXPOSE 3002

# Assumes an npm script named "start:interpreter" that launches the
# interpreter process. Adjust this if the entrypoint differs.
CMD ["npm", "run", "start:interpreter"]

