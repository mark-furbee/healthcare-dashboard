# Healthcare Dashboard

A full-stack healthcare patient-management dashboard built with React, TypeScript, FastAPI, PostgreSQL, and Docker.

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

## Using the app

- **Patients:** search by name or email, filter by status, and sort by any column. The list's
  state is kept in the URL, so Back, reloads, and shared links show the same results.
- **Patient record:** click any row to open it; "← Back to patients" returns to the same results.
  The record includes a generated summary and clinical notes, which you can add and delete.
- **Create, edit, delete:** the form checks input before saving, and a duplicate email is flagged
  on the Email field.
- **Allergies and conditions:** pick from the shared lists, or type a new name and press Enter.
  Names match regardless of capitalization, so "latex" selects "Latex".
- **Theme:** switch between light and dark in the sidebar (in the header on small screens).

## Tests and checks

GitHub Actions runs these checks on every push to `main` and every pull request, and also applies
the migrations to PostgreSQL ([ci.yml](.github/workflows/ci.yml)).

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

## API

FastAPI generates interactive docs for every endpoint, its parameters, and its responses at
<http://localhost:8000/docs> while the stack is running.

Invalid input returns `422` with one entry per field, a duplicate email included, so forms can show
it on the field. Unknown patients or notes return `404`. The audit log of deletions is available only
through the API (`GET /audit-log`); the app has no screen for it.

## Project layout

```text
backend/app/
  routers/        patients, notes, lookups (allergies, conditions), audit log
  schemas.py      request and response models; all validation rules
  models.py       SQLAlchemy models
  summary.py      summary generation
  audit.py        audit log entries
  seed.py         sample data
backend/alembic/versions/   schema migrations
frontend/src/
  api.ts          typed API client; turns errors into messages per field
  queries.ts      TanStack Query keys and queries
  pages/          one component per route
  components/     shared pieces, such as the patient table and notes
  theme.ts        all styling: palette, typography, component defaults
```

## Design decisions

- **The database does the list work.** Search, filter, sort, and paging run in one query that also
  returns the total, so only one page of patients reaches the browser.
- **Search never blocks.** Typing is debounced (300 ms), and the current page stays on screen while
  the next one loads. The list's state lives in the URL.
- **No global store.** Server data lives in TanStack Query. Keys start with `patients` or `patient`,
  so each change refreshes exactly what it affects; adding a note refreshes the summary.
- **One origin.** nginx serves the app and proxies `/api` to the backend, as the Vite dev server
  does, so there is no CORS setup and no API URL in the build.
- **Validation lives on the server and is mirrored on the client.** Pydantic rules are the
  authority; the Zod schema repeats them so most mistakes are caught before a request.
- **The database enforces integrity.** A unique constraint rejects duplicate emails without a
  racy check-then-insert, age is derived from date of birth, and allergies and conditions are
  shared lookup tables matched regardless of capitalization.
- **Clinical records are kept.** Deleting a note hides it; it's removed only with its patient. Every
  deletion is recorded in an audit log that identifies records by ID only, so it keeps no personal
  data after a patient is deleted.
- **Styling lives in the MUI theme.** Components use `sx` only for layout, so the light and dark
  themes apply everywhere without per-component code.
- **The summary is a template, not an LLM.** It is reproducible, and patient data stays in the
  system. It quotes long notes as excerpts and dates them in the viewer's time zone.
- **Tests go through public interfaces.** Backend tests call the API against in-memory SQLite;
  frontend tests render routes with only the API client stubbed.

## Trade-offs and next steps

This is an interview-sized project with fictional data only.

- **Authentication:** there are no user accounts, so the audit log can't record who acted, and
  anyone can view or change any record.
- **Audit log screen:** deletions are recorded but viewable only through the API; an admin page
  in the app would follow once there are user roles.
- **Patient deletion is permanent.** A clinical system would archive patients instead.
- **Coded vocabularies:** allergies and conditions are names; a clinical system would use SNOMED CT
  or ICD-10 codes.
- **Search** scans the table; at scale, a trigram index (`pg_trgm`) would keep it fast.
