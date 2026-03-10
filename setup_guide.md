# Mars IoT Platform - Quick Setup Guide

This guide will walk you through the process of getting the Mars IoT Platform up and running locally from a fresh git clone.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/products/docker-desktop) and Docker Compose
- [Node.js](https://nodejs.org/en/) (v20+ recommended)

## 2. Clone the Repository

First, clone the project to your local machine:
```bash
git clone https://github.com/AdriaticAlliance/AA
cd AA/source
```

## 3. Load the Simulator Image

The project relies on a proprietary Docker image for the simulator component ([mars-iot-simulator-oci.tar](file:///c:/Users/eripc/OneDrive/Desktop/workspace/prog_lab/AA/source/mars-iot-simulator-oci.tar)). You must load this image into your local Docker instance before attempting to build the stack.

```bash
docker load -i mars-iot-simulator-oci.tar
```
*Wait for Docker to display `Loaded image: mars-iot-simulator:multiarch_v1`*

## 4. Build and Start the Services

The entire platform (Frontend, Backend Rules Engine, Kafka Message Broker, Data Ingestion Gateways, and the Simulator) has been containerized and orchestrated via a single Docker Compose configuration.

To build the images and start the full suite of microservices in the background, run:

```bash
docker-compose up --build -d
```

Docker will download necessary base images (like Node and Nginx), install all `npm` dependencies inside the containers across all sub-services, build the React frontend bundle, and start the system. This process usually takes 1-3 minutes the first time.

## 5. Verify the Installation 

Once the containers are spinning, you can verify everything is functioning correctly by checking the main UIs:

| Service | Local URL |
| :--- | :--- |
| **Frontend Dashboard** | [http://localhost:3000](http://localhost:3000) |
| **Backend API Health** | [http://localhost:4000/health](http://localhost:4000/health) |
| **Simulator API Health** | [http://localhost:8080/health](http://localhost:8080/health) |

*Note: It takes a few seconds for Kafka to initialize and the ingestion services to start polling data. If the dashboard charts look empty immediately upon startup, wait 10 seconds and refresh.*

## Common Commands

If you need to view logs or gracefully shut down the application:

```bash
# View aggregated live logs across the whole cluster
docker-compose logs -f

# View logs for a specific service (e.g., the ingestion gate)
docker-compose logs -f ingestion-gate

# Shut down all services without losing SQLite data
docker-compose down
```
