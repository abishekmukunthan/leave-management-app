# Arogya Leave Management System - Docker & Deployment Guide

This guide provides complete instructions for containerizing, building, running, and deploying the **Arogya Leave Management System** using Docker, Docker Compose, and Docker Hub.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Docker Desktop Requirement](#2-docker-desktop-requirement)
3. [Environment Configuration](#3-environment-configuration)
4. [Local Docker Compose Build](#4-local-docker-compose-build)
5. [Starting the Application](#5-starting-the-application)
6. [Running Database Migrations](#6-running-database-migrations)
7. [Optional Demo Data Seeding](#7-optional-demo-data-seeding)
8. [Stopping the Application](#8-stopping-the-application)
9. [Viewing Logs](#9-viewing-logs)
10. [Rebuilding After Code Changes](#10-rebuilding-after-code-changes)
11. [Creating Production Docker Images](#11-creating-production-docker-images)
12. [Tagging Docker Hub Images](#12-tagging-docker-hub-images)
13. [Logging Into Docker Hub](#13-logging-into-docker-hub)
14. [Pushing Images to Docker Hub](#14-pushing-images-to-docker-hub)
15. [Pulling Images on Remote Servers](#15-pulling-images-on-remote-servers)
16. [Running Images on Another Server (VPS/Cloud)](#16-running-images-on-another-server-vpscloud)
17. [Production Environment Variable Setup](#17-production-environment-variable-setup)
18. [External Database & Supabase Configuration](#18-external-database--supabase-configuration)
19. [Troubleshooting & FAQ](#19-troubleshooting--faq)

---

## 1. Prerequisites
Before running the application with Docker:
- **Operating System**: macOS, Linux, or Windows (with WSL2).
- **RAM**: Minimum 4GB available memory.
- **Disk Space**: At least 5GB free disk space for Docker base images and build caches.
- **Node.js**: v18+ (if running tests or scripts locally outside of Docker).

---

## 2. Docker Desktop Requirement
Ensure Docker and Docker Compose (v2.x+) are installed and running:
- **macOS / Windows**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Ensure Docker Desktop is launched and shows "Engine running".
- **Linux**: Install Docker Engine and the Docker Compose plugin:
  ```bash
  docker --version
  docker compose version
  ```

---

## 3. Environment Configuration
From the project root directory, copy the example environment file to `.env`:

```bash
cp .env.example .env
```

Review the values in `.env`:
```env
# Database Settings
POSTGRES_DB=leave_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432

# Backend Settings
BACKEND_PORT=5001
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_here_min_32_characters
FRONTEND_URL=http://localhost,http://localhost:80,http://localhost:3000

# Frontend Settings
FRONTEND_PORT=80
VITE_API_URL=http://localhost:5001/api
VITE_SHOW_DEMO_CREDENTIALS=false
```

> **Note on Browser Networking**: Because React executes inside the end-user's web browser on the host machine, `VITE_API_URL` must point to a URL reachable by the host browser (`http://localhost:5001/api`), not an internal Docker container name like `http://backend:5001`.

---

## 4. Local Docker Compose Build
Build all three container images (`postgres`, `backend`, `frontend`):

```bash
docker compose build
```

To build without using cache (for a clean rebuild):
```bash
docker compose build --no-cache
```

---

## 5. Starting the Application
Start the containers in detached (background) mode:

```bash
docker compose up -d
```

Check the status of all running services:
```bash
docker compose ps
```

You should see:
| Service | Container Name | Port Mapping | Status |
| :--- | :--- | :--- | :--- |
| `postgres` | `arogya_postgres` | `0.0.0.0:5432->5432` | `Up (healthy)` |
| `backend` | `arogya_backend` | `0.0.0.0:5001->5001` | `Up (healthy)` |
| `frontend` | `arogya_frontend` | `0.0.0.0:80->80` | `Up (healthy)` |

### Application URLs:
- **Frontend Web UI**: [http://localhost](http://localhost) (or `http://localhost:80`)
- **Backend API Root**: [http://localhost:5001/](http://localhost:5001/)
- **Backend Health Check**: [http://localhost:5001/db-test](http://localhost:5001/db-test)

---

## 6. Running Database Migrations
When starting with a fresh database or after schema updates, execute the safe incremental migration runner:

```bash
docker compose run --rm backend npm run migrate
```

- This command runs only pending incremental migrations inside atomic transactions.
- It tracks applied migrations in `schema_migrations` and skips previously executed files.
- It **never** drops tables or deletes user data.

---

## 7. Optional Demo Data Seeding
To populate demo teams, demo accounts, and default leave entitlements for local development:

```bash
docker compose run --rm backend npm run db:seed
```

> **Safety Guard**: Seeding is strictly blocked if `NODE_ENV=production` to protect production databases from data loss.

---

## 8. Stopping the Application
To stop all running containers while preserving database data:
```bash
docker compose down
```

To stop all containers **and delete** the database volume (resets all data):
```bash
docker compose down -v
```

---

## 9. Viewing Logs
To stream logs from all services in real time:
```bash
docker compose logs -f
```

To view logs for a specific container:
```bash
# Backend logs
docker compose logs -f backend

# Frontend Nginx logs
docker compose logs -f frontend

# PostgreSQL logs
docker compose logs -f postgres
```

---

## 10. Rebuilding After Code Changes
When frontend or backend code is updated:
```bash
# Rebuild and restart updated services
docker compose up -d --build
```

Or rebuild a single service:
```bash
docker compose build frontend
docker compose up -d --no-deps frontend
```

---

## 11. Creating Production Docker Images
You can build standalone production images using Docker CLI:

```bash
# 1. Build Backend Production Image
docker build -t arogya-leave-backend:latest ./backend

# 2. Build Frontend Production Image (specifying production API URL)
docker build \
  --build-arg VITE_API_URL="https://api.yourdomain.com/api" \
  -t arogya-leave-frontend:latest \
  ./frontend
```

---

## 12. Tagging Docker Hub Images
Replace `<dockerhub-username>` with your actual Docker Hub username:

```bash
# Tag Backend
docker tag arogya-leave-backend:latest <dockerhub-username>/arogya-leave-backend:latest
docker tag arogya-leave-backend:latest <dockerhub-username>/arogya-leave-backend:v1.0.0

# Tag Frontend
docker tag arogya-leave-frontend:latest <dockerhub-username>/arogya-leave-frontend:latest
docker tag arogya-leave-frontend:latest <dockerhub-username>/arogya-leave-frontend:v1.0.0
```

---

## 13. Logging Into Docker Hub
Log in to your Docker Hub account from the terminal:

```bash
docker login
```
Enter your Docker Hub username and password (or Personal Access Token).

---

## 14. Pushing Images to Docker Hub
Push the tagged images to the Docker Hub registry:

```bash
docker push <dockerhub-username>/arogya-leave-backend:latest
docker push <dockerhub-username>/arogya-leave-backend:v1.0.0

docker push <dockerhub-username>/arogya-leave-frontend:latest
docker push <dockerhub-username>/arogya-leave-frontend:v1.0.0
```

---

## 15. Pulling Images on Remote Servers
On your production Linux host (AWS EC2, DigitalOcean Droplet, Hetzner, etc.):

```bash
docker pull <dockerhub-username>/arogya-leave-backend:latest
docker pull <dockerhub-username>/arogya-leave-frontend:latest
```

---

## 16. Running Images on Another Server (VPS/Cloud)
On the remote server, create a production `docker-compose.prod.yml`:

```yaml
version: "3.8"

services:
  backend:
    image: <dockerhub-username>/arogya-leave-backend:latest
    container_name: arogya_backend_prod
    restart: always
    environment:
      PORT: 5001
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      DB_SSL: require
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    ports:
      - "5001:5001"

  frontend:
    image: <dockerhub-username>/arogya-leave-frontend:latest
    container_name: arogya_frontend_prod
    restart: always
    ports:
      - "80:80"
```

Start the production stack:
```bash
docker compose -f docker-compose.prod.yml up -d
```

Run production migrations safely:
```bash
docker compose -f docker-compose.prod.yml run --rm backend npm run migrate
```

---

## 17. Production Environment Variable Setup
For production deployment, ensure the following environment variables are set:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Backend port | `5001` |
| `DATABASE_URL` | Hosted PostgreSQL Connection URI | `postgresql://user:pass@ep-xyz.supabase.co:5432/postgres?sslmode=require` |
| `DB_SSL` | Enable SSL for hosted DB | `require` or `true` |
| `JWT_SECRET` | Strong secret key for signing tokens | `64-character random hex string` |
| `FRONTEND_URL` | Allowed CORS origins (comma-separated) | `https://leave.arogya.com,https://leave-management.pages.dev` |
| `VITE_API_URL` | Public API endpoint for frontend build | `https://api.arogya.com/api` |

---

## 18. External Database & Supabase Configuration
To connect the backend to an external database like **Supabase PostgreSQL**:
1. Retrieve your connection string from the Supabase Project Dashboard (**Settings** -> **Database** -> **Connection string**).
2. Set `DATABASE_URL` in your `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
   DB_SSL=require
   ```
3. When `DATABASE_URL` is populated, the backend automatically uses this connection string with SSL certificate validation disabled (`rejectUnauthorized: false`) to support hosted poolers.
4. You can disable the local `postgres` service in `docker-compose.yml` or simply let the backend point to `DATABASE_URL`.

---

## 19. Troubleshooting & FAQ

### Q1: The browser shows "Network Error" or "Unable to connect to server".
- Check that the backend container is running: `docker compose ps`.
- Check if your browser can access `http://localhost:5001/`.
- Ensure `VITE_API_URL` was set to `http://localhost:5001/api` during image build.
- If frontend was rebuilt with a different URL, run `docker compose up -d --build frontend`.

### Q2: Direct page refresh on `/dashboard` or `/configuration` returns 404 in Nginx.
- Nginx is configured with `try_files $uri $uri/ /index.html;` in `frontend/nginx.conf`.
- Ensure `frontend/nginx.conf` was properly copied into `/etc/nginx/conf.d/default.conf` in the Dockerfile.

### Q3: How do I access PostgreSQL directly in the container?
Connect using `psql` through Docker:
```bash
docker exec -it arogya_postgres psql -U postgres -d leave_management
```

### Q4: CORS error in browser console (`Access to XMLHttpRequest blocked by CORS policy`).
- Check `FRONTEND_URL` in `.env`.
- Ensure the port you are accessing the frontend from (e.g. `http://localhost` or `http://localhost:80`) is included in `FRONTEND_URL` or matches `defaultAllowedOrigins` in `backend/src/app.js`.

### Q5: How do I reset the local database?
```bash
docker compose down -v
docker compose up -d
docker compose run --rm backend npm run migrate
docker compose run --rm backend npm run db:seed
```
