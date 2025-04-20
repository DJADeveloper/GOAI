from fastapi import FastAPI
from .routers import auth, goals, tasks, habits, brain_dump, analytics, users, settings

app = FastAPI(
    title="GOAI Backend",
    description="API for the GOAI goal and habit tracking application.",
    version="0.1.0",
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(habits.router, prefix="/api/habits", tags=["Habits"])
app.include_router(brain_dump.router, prefix="/api/brain-dump", tags=["Brain Dump"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the GOAI API"} 