# Contacts Service (Static Frontend + Node API + PostgreSQL)

## Prerequisites

- Node.js (>= 18)
- Docker + Docker Compose
- npm

## 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

This starts a `postgres:16` container with:

- DB: `contacts_db`
- User: `postgres`
- Password: `postgres`

And automatically runs `backend/sql/init.sql` to create the `contacts` table.

## 2. Run the backend API

```bash
cd backend
cp .env.example .env   # edit if needed
npm install
npm run dev
```

The API will listen on `http://localhost:4000` and expose:

- `GET /healthz`
- `GET /api/contacts`
- `POST /api/contacts`
- `DELETE /api/contacts/:id`

## 3. Build and serve the static frontend

```bash
cd frontend
npm install
npm run build          # compiles main.ts -> dist/main.js
npm run serve          # serves the static files
```

Make sure `backend/.env` has `CORS_ORIGIN` set to the origin where your static server runs, for example:

```env
CORS_ORIGIN=http://localhost:3000
```

Then open that URL in your browser, add a contact in the form, and you should see it appear in the list and persist via PostgreSQL.

