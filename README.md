# WorkFlow Pro

WorkFlow Pro is a fullstack enterprise workforce management and internal collaboration platform with:

- `apps/employee-mobile`: React Native employee app built with Expo Router
- `apps/web/admin-web`: React admin dashboard built with React, Vite, Tailwind, and shadcn-style primitives
- `apps/web/employee-web`: React employee web app built with React and Vite
- `backend`: FastAPI backend with PostgreSQL, Redis, JWT auth, WebSockets, and Azure Blob Storage

## Repository Layout

```text
apps/
  employee-mobile/
  web/
    admin-web/
    employee-web/
backend/
packages/
  shared-types/
```

## Quick Start

### 0. Prerequisites

- Node.js 20+
- Docker Desktop
- Python 3.11 recommended

> Important: backend currently does not run correctly on Python 3.14 because some compiled dependencies like `pydantic_core` are not loading there. Use Python 3.11 for the backend setup below.

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Create backend virtual environment with Python 3.11

```bash
cd backend
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment files

Copy each example file and set real secrets:

- `backend/.env.example` -> `backend/.env`
- `apps/web/admin-web/.env.example` -> `apps/web/admin-web/.env`
- `apps/web/employee-web/.env.example` -> `apps/web/employee-web/.env`
- `apps/employee-mobile/.env.example` -> `apps/employee-mobile/.env`

If you use the included `docker-compose.yml`, backend `.env` should match it:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5433/workflow_db
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:8081
```

Web env files:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000
```

Mobile env file:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
EXPO_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

### 4. Start infrastructure

Create PostgreSQL and Redis locally or use Docker.

```bash
docker compose up -d postgres redis
```

This starts:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6379`

### 5. Run migrations and seed roles

```bash
cd backend
.venv\Scripts\activate
alembic upgrade head
python -m app.seed.seed_data
```

### 6. Start the apps

Backend:

```bash
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

Admin + employee web together:

```bash
npm run dev:web
```

This starts:

- Admin web on `http://localhost:5173`
- Employee web on `http://localhost:5174`

Employee mobile:

```bash
npm run dev:mobile
```

Expo terminal opens and then you can press:

- `a` for Android
- `w` for web
- or scan the QR in Expo Go

## Full Local Run Order

Open separate terminals and run in this order:

### Terminal 1: database and redis

```bash
cd /path/to/your/project
docker compose up -d postgres redis
```

### Terminal 2: backend

```bash
cd /path/to/your/project/backend
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed.seed_data
uvicorn app.main:app --reload
```

### Terminal 3: web frontends

```bash
cd /path/to/your/project
npm install
npm run dev:web
```

### Terminal 4: mobile

```bash
cd /path/to/your/project
npm run dev:mobile
```

## Production Build Commands

Admin web:

```bash
npm run build:web
```

Backend:

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Mobile:

```bash
cd apps/employee-mobile
npx expo export
```

## PostgreSQL Setup

```sql
CREATE DATABASE workflow_db;
CREATE USER your_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE workflow_db TO your_user;
```

## Azure Blob Storage

Set the following backend environment variables:

- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY`
- `AZURE_STORAGE_CONTAINER`
- `AZURE_STORAGE_BASE_URL`

## Redis

Set `REDIS_URL=redis://localhost:6379/0`

## Default Roles

- `SUPER_ADMIN`
- `ADMIN`
- `TEAM_LEAD`
- `EMPLOYEE`
