import fastapi

from .routers import audit, lookups, notes, patients

app = fastapi.FastAPI(title="Healthcare Dashboard API")
app.include_router(patients.router)
app.include_router(notes.router)
app.include_router(lookups.router)
app.include_router(audit.router)


@app.get("/", include_in_schema=False)
def root():
    return fastapi.responses.RedirectResponse("/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
