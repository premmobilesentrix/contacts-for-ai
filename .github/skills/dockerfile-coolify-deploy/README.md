# Dockerfile & Coolify Deployment Skill

Complete workflow for vibe coders to containerize applications and deploy them to Coolify infrastructure.

## Files in This Skill

| File                          | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| **SKILL.md**                  | Main workflow documentation (7 phases: analyze → deploy) |
| **COOLIFY_MCP_REFERENCE.md**  | Complete Coolify-MCP tools reference with parameters     |
| **EXAMPLES_AND_TEMPLATES.md** | Real-world Dockerfile/compose examples                   |
| **README.md**                 | This file                                                |

## Quick Start

### How to invoke this skill:

```
@copilot /dockerfile-coolify-deploy

Then describe your application:
- "Containerize my Node.js backend and deploy to Coolify"
- "Create Dockerfile + docker-compose for frontend and deploy"
- "Analyze my app, generate containers, and push to Coolify infrastructure"
```

## What This Skill Does

**Input:** Application source code (folder or GitHub repo)

**Output:**

1. ✅ Analysis of tech stack and dependencies
2. ✅ Optimized Dockerfile (multi-stage when possible)
3. ✅ Two docker-compose files:
   - Local testing (with host port mappings)
   - Coolify deployment (no port conflicts)
4. ✅ GitHub repo verification/creation (Mobilesentrix org)
5. ✅ Deployment to Coolify infrastructure
6. ✅ Generated domain URL

## Workflow Phases

### 1. **ANALYZE**

- Scan source code
- Detect: tech stack, dependencies, build/start commands, ports
- Confirm findings with user

### 2. **DECIDE DOCKERFILE STRATEGY**

- Evaluate: Build dependencies, runtime requirements
- Decision tree: Distroless? Alpine? Single-stage?
- **Key rule:** If app needs shell commands at runtime → Use Alpine
- Show strategy to user for confirmation

### 3. **GENERATE DOCKERFILE**

- Create in `.coolify/` or `.deploy/` directory
- Multi-stage when possible (builder → minimal final image)
- Optimize for size and security
- Add proper EXPOSE and CMD

### 4. **GENERATE DOCKER-COMPOSE FILES**

- **Local** (`docker-compose.yml`): With host port mappings
- **Coolify** (`.coolify/docker-compose.yml`): No port conflicts
- Query Coolify for existing databases to reuse
- Add basic health checks

### 5. **GITHUB MANAGEMENT**

- Ensure repo exists in Mobilesentrix organization
- If admin creates repo, or offer user's personal account
- Commit and push generated files

### 6. **DEPLOY TO COOLIFY**

- Auto-detect target project on Coolify
- Create application via GitHub source
- Build pack: Docker Compose
- Trigger deployment
- Monitor status

### 7. **VERIFICATION**

- Check health endpoints
- Print generated domain URL
- Provide next steps

## Key Features

### ✅ Intelligent Dockerfile Generation

**Multi-stage optimization:**

- Separate builder and final stages
- Distroless for minimal attack surface (Node.js, Python)
- Alpine with shell if needed (migrations, curl, complex startups)
- Single-stage fallback if risky

**Technology support:**

- Node.js + TypeScript/JavaScript
- Python (Flask, Django, FastAPI)
- Go, Rust, Java (extensible)

### ✅ Coolify-Aware Docker Compose

**No port conflicts:**

- `.coolify/docker-compose.yml` has no port mappings
- Coolify manages ingress/proxy routing
- Prevents deployment failures when multiple apps use same port

**Database reuse:**

- Queries existing Coolify databases
- Replaces hardcoded URLs with internal Coolify DNS
- Avoids duplicate database deployments

**Health checks:**

- Basic, lenient health checks (not strict)
- Configurable intervals, timeouts, retries
- Tech-specific endpoints (Express, Nginx, Flask, etc.)

### ✅ GitHub Integration

**Mobilesentrix organization first:**

- Assumes repos in `github.com/Mobilesentrix/`
- Required for Coolify deployments via GitHub source

**Fallback options:**

- If user lacks repo creation rights: Ask DevOps admin
- Or: Create public repo on user's account (with warning)

### ✅ Zero-Configuration Deployment

- Auto-detects Coolify project to deploy to
- Recommends existing projects (e.g., "contacts")
- Requires minimal user input (mostly confirmations)
- Generates and prints deployment domain

## Decision Matrix

When to use what:

| Scenario                                          | Dockerfile          | Compose               |
| ------------------------------------------------- | ------------------- | --------------------- |
| Node.js API, no runtime shell needs               | Distroless          | No ports in .coolify/ |
| Node.js API with npm run migrate && npm run start | Alpine              | No ports in .coolify/ |
| Frontend (Vite/React)                             | Nginx final stage   | No ports in .coolify/ |
| Python Flask                                      | Alpine/slim         | No ports in .coolify/ |
| App using curl at runtime                         | Alpine (shell)      | No ports in .coolify/ |
| Build deps > 500MB                                | Single-stage Alpine | No ports in .coolify/ |

## Example Directories Generated

```
project-root/
├── .coolify/
│   ├── Dockerfile                    ← Production-ready
│   └── docker-compose.yml            ← Coolify deployment
├── docker-compose.yml                ← Local testing
├── .dockerignore                     ← Build optimization
└── [other source files]
```

## Troubleshooting

### Deployment fails immediately

→ Check `.coolify/docker-compose.yml` syntax  
→ Verify Dockerfile build command  
→ Review Node.js version match in Dockerfile

### Health check failing

→ Update health check endpoint in `.coolify/docker-compose.yml`  
→ Increase start_period for slow startups  
→ Check app logs in Coolify dashboard

### Port conflicts

→ Verify `.coolify/docker-compose.yml` has NO `ports:` section  
→ Only local testing `docker-compose.yml` should have port mappings

### Database connection error

→ Verify DATABASE_URL uses Coolify internal DNS (e.g., `postgres-internal`)  
→ Check credentials match Coolify database settings  
→ Ensure database exists and is healthy on Coolify

### GitHub repo not found

→ Verify repo name in `Mobilesentrix` organization  
→ If missing: Ask @devops to create repo  
→ Or use Option B: Personal public repo

## Related Documentation

- [SKILL.md](./SKILL.md) — Detailed workflow phases
- [COOLIFY_MCP_REFERENCE.md](./COOLIFY_MCP_REFERENCE.md) — All Coolify-MCP parameters
- [EXAMPLES_AND_TEMPLATES.md](./EXAMPLES_AND_TEMPLATES.md) — Real code examples

## For Vibe Coders

This skill is shared with all vibe coders. Feedback and improvements welcome:

- Found a better Dockerfile pattern? → Update examples
- Tool parameters changed in Coolify? → Update reference
- New language support needed? → Add phase logic

## FAQ

**Q: Can I use this for local development?**  
A: Yes! Use the local `docker-compose.yml` file with port mappings. The `.coolify/` version is strictly for Coolify deployments.

**Q: Do I need to manually edit the generated files?**  
A: Usually no. But review them before deployment—especially health check endpoints and environment variables.

**Q: What if my app needs a database backup strategy?**  
A: Configure backups in Coolify dashboard after deployment. The skill focuses on initial deployment.

**Q: Can I deploy multiple instances of same app?**  
A: Yes! Create separate applications on Coolify (or use GitHub webhooks for auto-deploy on push).

**Q: What's the difference between the two docker-compose files?**  
A: Local file has `ports:` for localhost access. Coolify file has no `ports:` to avoid conflicts when multiple apps deploy to same server.

---

**Version:** 1.0  
**Last Updated:** 2026-03-26  
**Created for:** Vibe Coders Team
