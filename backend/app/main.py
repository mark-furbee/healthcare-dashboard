import fastapi

from .routers import lookups, patients

app = fastapi.FastAPI(title="Healthcare Dashboard API")
app.include_router(patients.router)
app.include_router(lookups.router)


@app.get("/", include_in_schema=False)
def root():
    return fastapi.responses.RedirectResponse("/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
