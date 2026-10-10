import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import stream, auth, ingest, stations, alerts, tests, chemicals, dashboard, forecast, blog, devices, simulator_ctrl
from .simulator import start_simulator, stop_simulator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.DATA_MODE == "simulation":
        asyncio.create_task(start_simulator())
    yield
    # Shutdown
    if settings.DATA_MODE == "simulation":
        await stop_simulator()

app = FastAPI(
    title="AquaSentinel AI",
    description="IoT water-quality monitoring platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(stream.router, prefix="/api", tags=["stream"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(ingest.router, prefix="/api", tags=["ingest"])
app.include_router(stations.router, prefix="/api/stations", tags=["stations"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(alerts.rules_router, prefix="/api/alert-rules", tags=["alert-rules"])
app.include_router(tests.router, prefix="/api/tests", tags=["tests"])
app.include_router(chemicals.router, prefix="/api/chemicals", tags=["chemicals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["forecast"])
app.include_router(forecast.incidents_router, prefix="/api/incidents", tags=["incidents"])
app.include_router(blog.router, prefix="/api/blog", tags=["blog"])
app.include_router(devices.router, prefix="/api/devices", tags=["devices"])
app.include_router(simulator_ctrl.router, prefix="/api", tags=["simulator"])

@app.get("/")
async def root():
    return {"message": "AquaSentinel AI API is running."}
