from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from ..db import get_db
from ..models import Station, Alert, Test
from ..schemas import DashboardSummaryOut

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryOut)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    # Total stations
    stmt = select(func.count(Station.id))
    total_stations = (await db.execute(stmt)).scalar() or 0
    
    # Online/offline (basic logic: if status is offline it's offline)
    stmt = select(func.count(Station.id)).where(Station.status == "offline")
    offline_stations = (await db.execute(stmt)).scalar() or 0
    online_stations = total_stations - offline_stations
    
    # Tests today (just total for demo)
    stmt = select(func.count(Test.id))
    tests_today = (await db.execute(stmt)).scalar() or 0
    
    # Open alerts
    stmt = select(func.count(Alert.id)).where(Alert.status == "open", Alert.severity == "warning")
    open_warnings = (await db.execute(stmt)).scalar() or 0
    
    stmt = select(func.count(Alert.id)).where(Alert.status == "open", Alert.severity == "critical")
    open_criticals = (await db.execute(stmt)).scalar() or 0
    
    return {
        "total_stations": total_stations,
        "online_stations": online_stations,
        "offline_stations": offline_stations,
        "tests_today": tests_today,
        "open_warnings": open_warnings,
        "open_criticals": open_criticals,
        "open_incidents": 0, # Placeholder
    }
