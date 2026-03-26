---
name: dockerfile-coolify-deploy
description: "Analyze application source code, generate optimized Dockerfile and docker-compose files, manage GitHub repos, and deploy to Coolify infrastructure with health checks and database integration"
---

# Dockerfile & Coolify Deployment Skill

## Purpose

End-to-end workflow for vibe coders to:

1. **Analyze** application tech stack and dependencies
2. **Generate** optimized multi-stage Dockerfile (with fallback logic)
3. **Create** docker-compose files for local testing and Coolify deployment
4. **Manage** GitHub repository (Mobilesentrix org)
5. **Deploy** to Coolify with automatic health checks and database reuse

## Use When

- `"Generate Dockerfile and deploy to Coolify"`
- `"Create docker-compose for my app and deploy"`
- `"Containerize this application and push to Coolify"`
- `"Set up Dockerfile, then deploy to our Coolify infrastructure"`

## Workflow Overview

```
PHASE 1: ANALYZE
├─ Scan project structure, package.json, language files
├─ Detect: tech stack, runtime engines, dependencies
├─ Identify: exposed ports, configuration files, build commands
└─ Confirm findings with user

PHASE 2: DECIDE DOCKERFILE STRATEGY
├─ Evaluate: build dependencies, runtime requirements
├─ Check: distroless compatibility (shell needs, curl, migrations, compound commands)
├─ Decision: multi-stage (distroless/alpine final) OR single-stage (alpine)?
└─ Show strategy to user for confirmation

PHASE 3: GENERATE DOCKERFILE
├─ Create Dockerfile in .coolify/ or .deploy/ directory
├─ Use existing Dockerfiles as inspiration (if present)
├─ Implement builder stage + optimized final stage
├─ Minimize image size, attack surface
└─ Add proper EXPOSE and CMD/ENTRYPOINT

PHASE 4: GENERATE DOCKER-COMPOSE FILES
├─ Create local docker-compose.yml (with host port mappings)
├─ Create .coolify/docker-compose.yml (no host ports, for Coolify)
├─ Query Coolify infra for existing databases
├─ Replace hardcoded DB URLs with Coolify internal URLs
├─ Add basic health checks (not strict, mostly passing)
└─ Show files to user

PHASE 5: GITHUB MANAGEMENT
├─ Ensure app repo exists in Mobilesentrix org
├─ If missing: show admin workflow OR offer personal repo option
├─ Commit generated files
├─ Push to GitHub (main branch)
└─ Get repo URL for Coolify

PHASE 6: DEPLOY TO COOLIFY
├─ Auto-detect/recommend Coolify project (e.g., "contacts")
├─ Use GitHub source (Mobilesentrix org repo)
├─ Build Pack: Docker Compose
├─ Point to: .coolify/docker-compose.yml
├─ Configure: environment variables if needed
├─ Deploy & retrieve generated domain
└─ Print access URL

PHASE 7: VERIFICATION
├─ Poll deployment status on Coolify
├─ Check health endpoints
├─ Display success/warning messages
└─ Provide next steps (logs, debugging)
```

---

## Phase-by-Phase Instructions

### PHASE 1: ANALYZE PROJECT

**Steps:**

1. Ask user to provide the application folder/repository path
2. Scan the directory for:
   - `package.json` → Node.js version, dependencies, scripts
   - `requirements.txt`, `Pipfile`, `pyproject.toml` → Python
   - `go.mod`, `Cargo.toml`, `.java`, `pom.xml` → Other languages
   - `tsconfig.json` → TypeScript configuration
   - Existing `Dockerfile`, `.dockerignore` → guidance
3. Run code snippet to scan structure and extract:
   ```
   - Language/runtime
   - Build command (npm run build, cargo build, etc.)
   - Start command (npm run start, python app.py, etc.)
   - Exposed ports (inferred from code or config)
   - Build dependencies size/nature
   - Runtime dependencies
   ```
4. **Confirm with user:** Show detected stack and ask if corrections needed
5. **Ask clarifications:**
   - Are there environment-specific build steps?
   - Does app run migrations at startup?
   - Does app use shell commands (curl, etc.) at runtime?
   - Any special requirements (GPU, volumes, etc.)?

**Key Detection Logic:**

```
If package.json exists:
  ├─ Check: "type": "module" → ES modules
  ├─ Check: scripts.build, scripts.start, scripts.dev
  ├─ Extract: engines.node (must match Node.js version in Dockerfile)
  └─ List: dependencies, devDependencies

If tsconfig.json exists:
  └─ Note: TypeScript compilation needed (npm run build)

If Dockerfile exists:
  └─ Parse: FROM, RUN, CMD to extract insights
```

### PHASE 2: DECIDE DOCKERFILE STRATEGY

**Multi-stage vs Single-stage Decision Tree:**

```
Can we use DISTROLESS final stage?
  ├─ YES if:
  │  ├─ No runtime shell needs
  │  ├─ No curl/system calls
  │  └─ No compound commands (&&, ||, pipes)
  │
  └─ NO → Use ALPINE + SHELL if:
     ├─ App needs migrations: npm run migrate && npm run start
     ├─ App uses curl/wget at runtime
     ├─ App runs multiple startup commands
     ├─ Build dependencies > 500MB
     └─ Risk of breaking production
```

**Confirm with user:** Show selected strategy and risks.

**Distroless Incompatibilities to Check:**

- `npm run migrate && npm run start` → needs shell
- `curl http://dependency` at runtime → needs curl binary
- CMD with shell syntax → needs /bin/sh
- Chained commands in startup → needs shell

---

### PHASE 3: GENERATE DOCKERFILE

**Template Selection:**

**A) Multi-stage with Distroless (Recommended Size: ~100-200MB)**

```dockerfile
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 4000  # or detected port
CMD ["dist/server.js"]
```

**B) Multi-stage with Alpine (Recommended Size: ~150-300MB)**

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM alpine:latest

RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app

EXPOSE 4000
CMD ["node", "dist/server.js"]
```

**C) Single-stage with Alpine (Safest, Size: ~300-500MB)**

```dockerfile
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/server.js"]
```

**Generation Steps:**

1. Based on Phase 2 decision, select template A, B, or C
2. Detect and fill in:
   - Node version from package.json `engines.node`
   - Build command from package.json `scripts.build`
   - Start command from package.json `scripts.start`
   - Port from code analysis (search for `listen()`)
3. Add `.dockerignore` file:
   ```
   node_modules
   npm-debug.log
   .git
   .env
   dist
   .coolify
   .deploy
   ```
4. **Create in:** `.coolify/Dockerfile` (or `.deploy/Dockerfile`)
5. Show user the generated Dockerfile for approval

**Optimization Checks:**

- ✅ Use `.dockerignore` to exclude node_modules from COPY
- ✅ Layer cache: put `package*.json` copy before source code
- ✅ Use slim/alpine base images
- ✅ Remove npm cache in production: `RUN npm ci --omit=dev`
- ✅ Never include secrets in image

---

### PHASE 4: GENERATE DOCKER-COMPOSE FILES

#### 4A: LOCAL docker-compose.yml (with host port mapping)

**Purpose:** Local testing with port exposure

**Template:**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    container_name: app-local
    ports:
      - "3000:3000" # Host:Container
    environment:
      - NODE_ENV=development
      - PORT=3000
    # volumes: (optional for local dev)
    #   - .:/app
    #   - /app/node_modules
```

**Steps:**

1. Scan for existing docker-compose.yml
2. If it exists, parse it for inspiration (services, env vars, volumes)
3. Create enhanced version with:
   - Detected environment variables
   - Port mapping (host port = container port)
   - Health check (basic)
   - Dependencies ordering
4. **Save to:** `docker-compose.yml` (root or project root)
5. Show user for approval

#### 4B: .coolify/docker-compose.yml (for Coolify deployment)

**Purpose:** Deploy to Coolify without host port conflicts

**Critical Rules:**

- ❌ NO `ports:` → Coolify manages routing via proxy/ingress
- ❌ NO hardcoded database URLs → use internal Coolify URLs
- ✅ Environment variables for configuration
- ✅ Basic health checks (not strict)
- ✅ Service discovery via service names

**Template:**

```yaml
services:
  app:
    build:
      context: .
      dockerfile: .coolify/Dockerfile
    container_name: app-coolify
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://user:pass@postgres-service-internal:5432/dbname
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://localhost:3000/healthz').then(r=>{if(!r.ok)process.exit(1)})",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

**Database Integration:**

1. Query Coolify infrastructure: `mcp_coolify-mcp_get_infrastructure_overview`
2. Identify existing PostgreSQL/MySQL/etc. services
3. For each database in docker-compose.yml:
   - Ask user: "Reuse existing Coolify database or deploy new one?"
   - If reuse: replace `localhost:5432` with internal Coolify URL (e.g., `postgres-service-internal:5432`)
   - If deploy: keep database service in compose

**Health Check Logic:**

```
For Node.js:
  - Check: GET /healthz (basic endpoint)
  - If app has no /healthz, use: node -e "http.request(...)"
  - Interval: 30s (not aggressive)
  - Timeout: 10s
  - Retries: 3
  - Start period: 30s (allow warmup)

For Python/Go/Other:
  - Check: curl http://localhost:PORT or equivalent
  - Interval: 30s
  - Timeout: 10s
```

**Steps:**

1. Infer environment variables from:
   - `.env.example` or `.env` file
   - Code comments (e.g., `process.env.DATABASE_URL`)
2. Query Coolify: get list of running databases
3. For each service needing a database:
   - Show user: "Found PostgreSQL on Coolify. Reuse? (Y/n)"
   - Prompt for internal connection string if reusing
4. Generate compose with NO port mappings
5. Add basic health checks
6. **Save to:** `.coolify/docker-compose.yml`
7. Show user for approval

---

### PHASE 5: GITHUB MANAGEMENT

**Repository Requirements:**

- All code must be on GitHub (Mobilesentrix org or user's account)
- Used by Coolify to trigger deployments

**Flow:**

```
Does repo exist in Mobilesentrix org?
├─ YES → Proceed to commit & push
├─ NO (user doesn't have create permission):
│   ├─ Option A: Ask DevOps admin to create repo
│   ├─ Option B: Create on user's personal account (public)
│   └─ Show instruction: "Ask @devops to transfer repo to Mobilesentrix"
└─ Ask: Which option? (A or B)
```

**Steps:**

1. **Check repo existence:**

   ```bash
   git ls-remote https://github.com/Mobilesentrix/repo-name.git
   ```

   - If exists → proceed
   - If not → show options A/B

2. **Option A: Using Mobilesentrix Org Repo**

   ```bash
   git remote set-url origin https://github.com/Mobilesentrix/repo-name.git
   git add .coolify/Dockerfile .coolify/docker-compose.yml docker-compose.yml
   git commit -m "feat: add Coolify deployment configuration"
   git push -u origin main
   ```

   - Get final repo URL: `https://github.com/Mobilesentrix/repo-name`

3. **Option B: Using User's Personal Repo (if Mobilesentrix unavailable)**

   ```bash
   # Prompt user for personal GitHub token
   # Create repo via GitHub API or manual creation
   # Push code
   # Show warning: "Repository is public. Ask DevOps to transfer to Mobilesentrix org when ready."
   ```

   - Get final repo URL: `https://github.com/username/repo-name`

4. **Commit generated files:**
   - `.coolify/Dockerfile`
   - `.coolify/docker-compose.yml`
   - `docker-compose.yml` (local, if new)
   - Commit message: `"feat: add Coolify deployment configuration"`

5. **Confirm with user:** Show repo URL and branch

---

### PHASE 6: DEPLOY TO COOLIFY

**Prerequisites:**

- GitHub repo ready
- Dockerfile + docker-compose files generated
- Coolify infrastructure accessible

**Coolify-MCP Tools Used:**

| Task                       | Tool                                                   | Arguments             |
| -------------------------- | ------------------------------------------------------ | --------------------- |
| Get current infrastructure | `mcp_coolify-mcp_get_infrastructure_overview`          | none                  |
| List projects              | `mcp_coolify-mcp_projects`                             | action: list          |
| Auto-detect project        | User confirmation or auto-recommend (e.g., "contacts") |                       |
| Create application         | `mcp_coolify-mcp_application`                          | action: create_github |
| Deploy application         | `mcp_coolify-mcp_deploy`                               | tag_or_uuid           |
| List deployments           | `mcp_coolify-mcp_deployment`                           | action: list_for_app  |

**Deployment Steps:**

1. **Get Coolify infrastructure overview:**

   ```
   Call: mcp_coolify-mcp_get_infrastructure_overview
   Result: {servers, projects, applications, databases}
   ```

2. **Auto-detect/recommend project:**
   - Show user: "Available projects: [list]"
   - Recommend: Most recently updated, or ask user
   - Confirm: "Deploy to project: {project_name}? (Y/n)"

3. **Create application on Coolify:**

   ```
   Call: mcp_coolify-mcp_application
   Parameters:
     - action: "create_github"
     - name: "repo-name-identifier"
     - project_uuid: "{selected_project_uuid}"
     - environment_uuid: "{environment_uuid}"  # get from project
     - git_repository: "Mobilesentrix/repo-name"
     - git_branch: "main"
     - build_pack: "docker-compose"  # KEY: Docker Compose build pack
     - server_uuid: "{localhost_server_uuid}"
     - fqdn: "{auto-generated or user-provided}"
   ```

4. **Specify docker-compose location:**
   - Set build context to: `.coolify/docker-compose.yml`
   - Ensure Coolify points to correct compose file

5. **Configure environment variables (if needed):**
   - Prompt user: "Any environment variables to set? (or skip)"
   - Example: `DATABASE_URL`, `API_KEY`, etc.
   - Set via Coolify API or confirm they're in compose

6. **Trigger deployment:**

   ```
   Call: mcp_coolify-mcp_deploy
   Parameters:
     - tag_or_uuid: "{application_uuid}"
     - force: false  # or true if user wants force redeploy
   ```

7. **Monitor deployment:**

   ```
   Call: mcp_coolify-mcp_deployment (poll status)
   Until: deployment.status == "success" or "failed"
   Timeout: 5 minutes
   ```

8. **Retrieve generated domain:**
   - From Coolify response: `application.fqdn`
   - Example: `https://app-uuid.apps.mobilesentrix.com`
   - Print to user: "✅ Deployed to: {fqdn}"

---

### PHASE 7: VERIFICATION & HANDOFF

**Verification Checklist:**

```
✅ Dockerfile generated correctly
✅ Docker-compose files created (.coolify/ + local)
✅ GitHub repo updated & pushed
✅ Application created on Coolify
✅ Deployment triggered successfully
✅ Health check passing (wait 2-3 min for startup)
✅ Domain accessible
```

**User Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DEPLOYMENT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Artifacts Generated:
  • .coolify/Dockerfile
  • .coolify/docker-compose.yml
  • docker-compose.yml (local)

🔗 GitHub:
  • Repo: https://github.com/Mobilesentrix/repo-name
  • Branch: main
  • Files pushed: ✅

🚀 Coolify Deployment:
  • Project: contacts
  • Status: Deploying
  • Domain: https://app-uuid.apps.mobilesentrix.com
  • Health Check: Pending (wait 2-3 min)

📝 Next Steps:
  1. Wait for health check to pass
  2. Test: curl https://app-uuid.apps.mobilesentrix.com
  3. View logs: Coolify Dashboard → Deployments
  4. For issues: Check .coolify/docker-compose.yml environment
```

**Troubleshooting Guidance:**

| Issue                      | Check                                                    |
| -------------------------- | -------------------------------------------------------- |
| Deployment failing         | Check Coolify logs; verify docker-compose.yml syntax     |
| Health check failing       | Endpoint may be different; update healthcheck in compose |
| Port conflicts             | Verify .coolify/docker-compose.yml has NO `ports:`       |
| Database connection failed | Verify DATABASE_URL uses Coolify internal DNS            |
| Build failing              | Check Dockerfile build command; review Node.js version   |

---

## Decision Matrix

| Scenario                                    | Action                                      |
| ------------------------------------------- | ------------------------------------------- |
| App uses `npm run migrate && npm run start` | Use Alpine + shell, NOT distroless          |
| App startup needs curl                      | Use Alpine, NOT distroless                  |
| App has no runtime shell needs              | Use distroless for minimal size             |
| Build deps > 500MB                          | Consider single-stage Alpine                |
| Repo doesn't exist in Mobilesentrix         | Create in user account, warn about transfer |
| Database exists on Coolify                  | Reuse internal URL, don't redeploy          |
| Two frontend instances needed               | Deploy 2 applications from same repo        |

---

## Common Patterns

### Node.js + Express (Port 4000)

```
Detect: package.json with express
Build: npm run build
Start: node dist/server.js
Port: 4000
```

### Node.js + Vite Frontend (Port 3000)

```
Detect: package.json with vite
Build: vite build --mode production
Start: vite preview (or serve dist/)
Port: 3000
```

### Python + Django/Flask (Port 8000)

```
Detect: requirements.txt + manage.py/app.py
Build: pip install -r requirements.txt
Start: python -m gunicorn app:app (Flask) or python manage.py runserver (Django)
Port: 8000
```

---

## Files Generated

```
.coolify/
├─ Dockerfile                    # Optimized production image
├─ docker-compose.yml            # Coolify deployment (no host ports)
└─ .dockerignore                 # Build optimization

docker-compose.yml               # Local testing (with host ports)

.github/
└─ Generated files tracking (optional audit log)
```

---

## Error Handling

**Dockerfile Generation Errors:**

- Missing package.json → Ask user to specify language/framework
- Conflicting build commands → Show user options, let them choose
- Port not detected → Ask user to specify

**Compose Generation Errors:**

- Database URL invalid → Query Coolify, suggest alternatives
- Health check endpoint missing → Use conservative defaults

**GitHub Errors:**

- Repo not found → Offer Option A/B workflow
- Authentication failed → Request GitHub token

**Coolify Deployment Errors:**

- Invalid docker-compose syntax → Validate before submission
- Project not found → Auto-detect or let user choose
- Build pack mismatch → Confirm Docker Compose selected

---

## Testing the Skill

### Test Case 1: TypeScript + Node.js + Express

```
Input: vibe-coded/backend
Expected:
  ✅ Detects: Node.js, TypeScript, Express
  ✅ Strategy: Multi-stage with distroless (no runtime shell needs)
  ✅ Dockerfile: builder → distroless:nodejs22
  ✅ Port: 4000
  ✅ Deploy to Coolify successfully
```

### Test Case 2: Vite + React Frontend

```
Input: vibe-coded/frontend
Expected:
  ✅ Detects: Node.js, Vite, React
  ✅ Strategy: Multi-stage with nginx final stage
  ✅ Dockerfile: builder → nginx:alpine
  ✅ Port: 80 (or 3000 for vite preview)
  ✅ No host port in .coolify/docker-compose.yml
```

---

## Maintenance Notes

- Update Node versions annually (follow LTS releases)
- Distroless image URLs: Review for deprecated versions
- Alpine compatibility: Test edge cases with new versions
- Coolify-MCP tool changes: Monitor for API updates
