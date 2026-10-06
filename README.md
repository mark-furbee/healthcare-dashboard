# Healthcare Dashboard

An ongoing full-stack take-home exercise: a healthcare patient-management dashboard built with
React, TypeScript, FastAPI, PostgreSQL, and Docker.

- `backend/`: FastAPI, SQLAlchemy, Alembic migrations, sample-data seed
- `frontend/`: React, TypeScript, Vite, MUI
- `docker-compose.yml`: runs Postgres, the API, and the built frontend

## Running locally

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). The tests and the dev
server also need Python 3.12 and Node.js 22. Commands are the same in Git Bash and PowerShell unless
both are shown.

```bash
cp .env.example .env              # Git Bash, first time only
```

```powershell
Copy-Item .env.example .env       # PowerShell, first time only
```

```text
docker compose up --build
```

The first start applies the migrations and seeds 100 sample patients.

- App: <http://localhost:5173>
- API: <http://localhost:8000> (docs at `/docs`), also reachable through the app at
  `http://localhost:5173/api/...`. Other paths on port 5173 load the app, not the API.

Reset the database with `docker compose down -v`, then start again.

To add a migration, add a file to `backend/alembic/versions/` (see `0001_initial.py`); it's applied
on the next `docker compose up --build`.

## Tests and checks

Backend, Git Bash (create and install only the first time):

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate && pip install -r requirements-dev.txt
pytest && ruff check . && ruff format --check .
```

Backend, PowerShell:

```powershell
cd backend
python -m venv .venv; .venv\Scripts\Activate.ps1; pip install -r requirements-dev.txt
pytest; ruff check .; ruff format --check .
```

If PowerShell blocks `Activate.ps1`, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

Frontend (`npm ci` only the first time):

```text
cd frontend
npm ci
npm test
npm run lint
npx prettier --check src
npm run build
```

## Frontend dev server

For hot reload, start the stack, then in `frontend/` run `npm run dev`. It forwards `/api` to the
backend on port 8000. If the Docker frontend holds port 5173, Vite uses the next free port and
prints it.
