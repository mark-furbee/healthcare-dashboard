import fastapi

app = fastapi.FastAPI(title="Healthcare Dashboard API")


@app.get("/", include_in_schema=False)
def root():
    return fastapi.responses.RedirectResponse("/docs")


@app.get("/health")
def health():
    return {"status": "ok"}
