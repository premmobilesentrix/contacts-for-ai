---
# Example Dockerfile and docker-compose templates
---

# Examples & Templates

Use these as starting points when generating Dockerfiles and docker-compose files.

## Example 1: Node.js + TypeScript Backend (Express API)

### Source Analysis

```
Language: Node.js 22
Framework: Express
Build: npm run build (TypeScript → JavaScript)
Start: node dist/server.js
Port: 4000
Runtime needs: No shell, no curl → ✅ Distroless compatible
Build deps: ~200MB → Multi-stage recommended
```

### Generated Files

#### .coolify/Dockerfile

```dockerfile
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Final stage: distroless (minimal, no shell)
FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app

EXPOSE 4000

CMD ["dist/server.js"]
```

#### .coolify/docker-compose.yml (Coolify deployment)

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    container_name: contacts-backend
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DATABASE_URL=postgres://postgres:postgres@postgres-internal:5432/contacts_db
      - CORS_ORIGIN=https://app-uuid.apps.mobilesentrix.com
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://localhost:4000/healthz').then(r=>{if(!r.ok)process.exit(1)})",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16
    container_name: contacts-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: contacts_db
    volumes:
      - contacts_pgdata:/var/lib/postgresql/data
      - ./backend/sql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d contacts_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  contacts_pgdata:
```

#### docker-compose.yml (Local testing - with host ports)

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    container_name: contacts-backend-local
    ports:
      - "4000:4000" # Host port → Container port
    environment:
      - NODE_ENV=development
      - PORT=4000
      - DATABASE_URL=postgres://postgres:postgres@localhost:5432/contacts_db
      - CORS_ORIGIN=http://localhost:3000
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16
    container_name: contacts-postgres-local
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: contacts_db
    volumes:
      - contacts_pgdata:/var/lib/postgresql/data
      - ./backend/sql/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d contacts_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  contacts_pgdata:
```

---

## Example 2: Node.js + Vite Frontend (React SPA)

### Source Analysis

```
Language: Node.js 22 (build-time only)
Framework: Vite + React
Build: npm run build (outputs dist/)
Start: nginx (serves static files)
Port: 80 (or 3000 for vite preview)
Runtime needs: No Node.js in final image → ✅ Nginx recommended
Build deps: ~150MB → Multi-stage with nginx final
```

### Generated Files

#### .coolify/Dockerfile

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Final stage: nginx (serves built assets)
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf (Required for SPA routing)

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### .coolify/docker-compose.yml (Coolify deployment - NO ports)

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    container_name: contacts-frontend
    environment:
      - VITE_API_BASE=https://backend-uuid.apps.mobilesentrix.com/api
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "wget --no-verbose --tries=1 --spider http://localhost/index.html || exit 1",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

#### docker-compose.yml (Local testing)

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    container_name: contacts-frontend-local
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE=http://localhost:4000/api
    volumes:
      - .:/app
      - /app/node_modules
      - /app/dist
```

---

## Example 3: App with Runtime Shell Needs (Alpine + Shell)

### Scenario

App runs migrations at startup: `npm run migrate && npm run start`

### Decision

❌ Cannot use distroless (no shell support for `&&`)  
✅ Use Alpine + shell

#### .coolify/Dockerfile

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Final stage: Alpine (supports shell)
FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app

EXPOSE 3000

# CMD supports shell syntax (&&, ||, pipes)
CMD ["sh", "-c", "npm run migrate && npm run start"]
```

#### .coolify/docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://user:pass@postgres-internal:5432/db
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://localhost:3000/').then(r=>{if(!r.ok)process.exit(1)})",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s # Longer startup for migrations
```

---

## Example 4: Python Flask Application

### Source Analysis

```
Language: Python 3.11
Framework: Flask + SQLAlchemy
Build: pip install -r requirements.txt
Start: python -m gunicorn app:app
Port: 8000
Runtime needs: Python runtime → ✅ Alpine or slim
Build deps: ~200MB
```

### Generated Files

#### .coolify/Dockerfile

```dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

#### .coolify/docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgres://user:pass@postgres-internal:5432/db
      - SECRET_KEY=change-me-in-production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## .dockerignore Template

Always include in root:

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
.env.*.local
dist
build
.DS_Store
*.log
.coolify
.deploy
.github
README.md
docker-compose.yml
Dockerfile
```

---

## Health Check Patterns

### Node.js Express

```yaml
healthcheck:
  test:
    [
      "CMD",
      "node",
      "-e",
      "fetch('http://localhost:4000/healthz').then(r=>{if(!r.ok)process.exit(1)})",
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

### Nginx

```yaml
healthcheck:
  test:
    [
      "CMD-SHELL",
      "wget --no-verbose --tries=1 --spider http://localhost/index.html || exit 1",
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

### Python Flask

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

### Generic HTTP

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:PORT || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## Environment Variables Template

Create `.env.example` in root:

```env
# Backend
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
CORS_ORIGIN=http://localhost:3000

# Frontend
VITE_API_BASE=http://localhost:4000/api

# Secrets (change in production)
SECRET_KEY=dev-secret-key-change-me
JWT_SECRET=dev-jwt-secret-change-me
```

---

## Deployment Checklist

Before deploying to Coolify, verify:

```
✅ Dockerfile builds locally:
   docker build -f .coolify/Dockerfile -t test-image .

✅ docker-compose up works locally:
   docker-compose down
   docker-compose up -d

✅ Health checks pass:
   curl http://localhost:PORT/healthz

✅ .dockerignore exists

✅ No hardcoded secrets in Dockerfile or docker-compose.yml

✅ git add/commit/push completed

✅ GitHub repo is accessible (public or with SSH key)

✅ Environment variables set in Coolify dashboard

✅ Database URL uses correct internal hostname (if Coolify DB)
```
