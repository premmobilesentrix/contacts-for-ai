---
# Coolify-MCP Tools Reference for Deployment
---

# Coolify-MCP Tool Reference

This file documents the Coolify-MCP tools used in the dockerfile-coolify-deploy skill.

## Infrastructure & Monitoring

### `mcp_coolify-mcp_get_infrastructure_overview`

Get summary of all infrastructure resources.

**Usage:**

```
Call: mcp_coolify-mcp_get_infrastructure_overview
(no parameters)

Returns:
{
  "summary": {
    "servers": number,
    "projects": number,
    "applications": number,
    "databases": number,
    "services": number
  },
  "servers": [...],
  "projects": [...],
  "applications": [...],
  "databases": [...],
  "services": [...]
}
```

**Use in skill:** Phase 6 - Get overview before deployment

---

### `mcp_coolify-mcp_list_applications`

List all deployed applications (summary).

**Usage:**

```
Call: mcp_coolify-mcp_list_applications
Parameters:
  - page: number (default: 1)
  - per_page: number (default: 15)

Returns: Array of {uuid, name, status, fqdn, git_repository, git_branch}
```

**Use in skill:** Phase 6 - Show user existing apps, recommend project

---

### `mcp_coolify-mcp_list_databases`

List all databases.

**Usage:**

```
Call: mcp_coolify-mcp_list_databases
Parameters:
  - page: number
  - per_page: number

Returns: Array of databases with type (postgresql, mysql, mariadb, mongodb, etc.)
```

**Use in skill:** Phase 4 - Query for existing databases to reuse

---

## Application Lifecycle

### `mcp_coolify-mcp_application`

Create, update, or delete applications.

**Actions:**

#### create_github

Deploy from GitHub repository.

```
Parameters:
  - action: "create_github"
  - name: string (display name)
  - project_uuid: string (required)
  - environment_uuid: string (required)
  - git_repository: string (format: "owner/repo")
  - git_branch: string (default: "main")
  - build_pack: string (must be "docker-compose" for this skill)
  - server_uuid: string (where to deploy)
  - fqdn: string (domain, auto-generated if omitted)
  - description: string (optional)
  - health_check_enabled: boolean
  - health_check_path: string (e.g., "/healthz")
  - health_check_port: number
  - health_check_method: string ("GET", "POST")
  - health_check_interval: number (seconds)
  - health_check_timeout: number (seconds)
  - health_check_retries: number
  - health_check_start_period: number (warmup seconds)

Returns: {uuid, name, status, fqdn, ...}
```

**Use in skill:** Phase 6 - Create application on Coolify

---

#### update

Update existing application.

```
Parameters:
  - action: "update"
  - uuid: string (application UUID)
  - name: string (optional)
  - description: string (optional)
  - fqdn: string (optional)
  - health_check_*: (optional, same fields as create)
  - ... other fields

Returns: Updated application object
```

---

#### delete

Delete application.

```
Parameters:
  - action: "delete"
  - uuid: string (application UUID)
  - delete_volumes: boolean (delete persistent volumes?)

Returns: Success message
```

---

### `mcp_coolify-mcp_service`

Manage Docker services (databases, caches, etc.).

```
Parameters:
  - action: "create" | "update" | "delete"
  - name: string
  - project_uuid: string
  - server_uuid: string
  - environment_name: string
  - type: string (e.g., "postgresql", "mysql", "redis")
  - docker_compose_raw: string (base64-encoded docker-compose YAML)
  - description: string

Returns: Service object with UUID
```

**Note:** Use this if you need to deploy databases alongside apps.

---

## Deployment Management

### `mcp_coolify-mcp_deploy`

Trigger deployment of an application or project.

**Usage:**

```
Parameters:
  - tag_or_uuid: string (application UUID or tag)
  - force: boolean (force redeploy, default: false)

Returns: {deployment_uuid, status, ...}
```

**Use in skill:** Phase 6 - Trigger deployment after app creation

---

### `mcp_coolify-mcp_deployment`

Get deployment status, logs, or list deployments for an app.

**Actions:**

#### get (deployment details & logs)

```
Parameters:
  - action: "get"
  - uuid: string (deployment UUID)
  - lines: number (lines of logs to include, default: 0 unless specified)
  - max_chars: number (max characters of logs)

Returns: Deployment object with status, logs, timestamps
```

#### cancel

```
Parameters:
  - action: "cancel"
  - uuid: string (deployment UUID)

Returns: Success message
```

#### list_for_app

```
Parameters:
  - action: "list_for_app"
  - uuid: string (application UUID)
  - page: number
  - lines: number (log lines per deployment)

Returns: Array of deployments with status
```

**Use in skill:** Phase 6/7 - Monitor deployment status, show logs

---

### `mcp_coolify-mcp_redeploy_project`

Redeploy all applications in a project.

```
Parameters:
  - project_uuid: string
  - force: boolean (default: false)

Returns: Array of deployment started messages
```

---

## Project & Environment Management

### `mcp_coolify-mcp_environments`

Manage project environments (production, staging, etc.).

**Actions:**

#### list

```
Parameters:
  - action: "list"
  - project_uuid: string

Returns: Array of environments
```

#### get

```
Parameters:
  - action: "get"
  - project_uuid: string

Returns: Environment details (includes databases missing from main API)
```

#### create

```
Parameters:
  - action: "create"
  - project_uuid: string
  - name: string
  - description: string

Returns: Environment object
```

---

## Database Management

### `mcp_coolify-mcp_database_backups`

Manage database backups and retention policies.

```
Parameters:
  - action: "list_schedules" | "get_schedule" | "create" | "update" | "delete"
  - database_uuid: string (required for most actions)
  - database_backup_retention_*: Various retention settings
  - s3_storage_uuid: string (for S3 backups)
  - enabled: boolean

Returns: Backup schedule or list
```

---

## GitHub Integration

### `mcp_coolify-mcp_github_apps`

Manage GitHub Apps for deployments.

**Actions:**

#### list

```
Returns: Array of configured GitHub Apps
```

#### get

```
Parameters:
  - id: number (GitHub App ID)

Returns: GitHub App details
```

#### create

```
Parameters:
  - name: string
  - app_id: number
  - client_id: string
  - client_secret: string
  - private_key_uuid: string
  - webhook_secret: string
  - organization: string
  - custom_port: number
  - custom_user: string
  - is_system_wide: boolean

Returns: GitHub App configuration
```

---

## SSH & Cloud Tokens

### `mcp_coolify-mcp_private_keys`

Manage SSH keys for repositories.

**Actions:** list, get, create, update, delete

```
Parameters:
  - action: "list" | "get" | "create" | "update" | "delete"
  - name: string
  - private_key: string (PEM format)
  - description: string

Returns: Key listing or confirmation
```

---

### `mcp_coolify-mcp_cloud_tokens`

Manage cloud provider tokens (Hetzner, DigitalOcean).

**Actions:** list, get, create, update, delete, validate

```
Parameters:
  - action: "list" | "get" | "create" | "update" | "delete" | "validate"
  - provider: "hetzner" | "digitalocean"
  - name: string
  - token: string
  - uuid: string (for get/update/delete)

Returns: Token listing or validation result
```

---

## Diagnostic Tools

### `mcp_coolify-mcp_find_issues`

Scan infrastructure for problems.

```
Call: mcp_coolify-mcp_find_issues
(no parameters)

Returns: Array of issues found {type, severity, description, suggested_fix}
```

**Use in skill:** Phase 7 - Verify deployment health

---

## Deployment Workflow Example

Here's the exact flow for deploying an app:

### Step 1: Get Overview

```python
response = mcp_coolify-mcp_get_infrastructure_overview()
servers = response.get("servers", [])
projects = response.get("projects", [])
databases = response.get("databases", [])
```

### Step 2: Create Application

```python
response = mcp_coolify-mcp_application(
    action="create_github",
    name="my-app",
    project_uuid=project["uuid"],
    environment_uuid=environment["uuid"],
    git_repository="Mobilesentrix/my-app",
    git_branch="main",
    build_pack="docker-compose",
    server_uuid=servers[0]["uuid"],
    fqdn=None,  # auto-generated
    health_check_enabled=True,
    health_check_path="/healthz",
    health_check_port=3000,
    health_check_method="GET",
    health_check_interval=30,
    health_check_timeout=10,
    health_check_retries=3,
    health_check_start_period=30
)
app_uuid = response["uuid"]
```

### Step 3: Deploy

```python
deploy_response = mcp_coolify-mcp_deploy(
    tag_or_uuid=app_uuid,
    force=False
)
deployment_uuid = deploy_response["uuid"]
```

### Step 4: Monitor (Poll)

```python
while True:
    deployment = mcp_coolify-mcp_deployment(
        action="get",
        uuid=deployment_uuid,
        lines=50
    )
    if deployment["status"] == "success":
        print(f"✅ Deployed to: {response['fqdn']}")
        break
    elif deployment["status"] == "failed":
        print("❌ Deployment failed")
        print(deployment["logs"])
        break
    time.sleep(5)  # Poll every 5 seconds
```

---

## Notes for Skill Implementation

1. **Build Pack:** Always use `"docker-compose"` for this skill
2. **Docker Compose Location:** Specify `.coolify/docker-compose.yml` path
3. **Health Checks:** Keep conservative (interval: 30s, retries: 3, start_period: 30s)
4. **FQDNs:** Let Coolify auto-generate or allow user input
5. **Servers:** Typically only one "localhost" server for self-hosted Coolify
6. **Databases:** Query existing before creating new services
