from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from ..db import get_db
from ..models import Station, Measurement
from ..schemas import StationOut, MeasurementOut

router = APIRouter()

@router.get("", response_model=List[StationOut])
async def get_stations(mode: str = Query("simulation"), db: AsyncSession = Depends(get_db)):
    stmt = select(Station)
    result = await db.execute(stmt)
    stations = result.scalars().all()

    # Map mode name to the source value stored in measurements
    source = "simulated" if mode == "simulation" else mode

    out = []
    for s in stations:
        # Get latest readings matching the mode
        stmt_m = select(Measurement).where(
            Measurement.station_id == s.id,
            Measurement.source == source
        ).order_by(desc(Measurement.ts)).limit(10)
        res_m = await db.execute(stmt_m)
        measurements = res_m.scalars().all()

        latest = {}
        last_ts = None
        for m in measurements:
            if m.parameter not in latest:
                latest[m.parameter] = {
                    "value": m.value,
                    "unit": m.unit,
                    "ts": m.ts.isoformat(),
                    "source": m.source,
                    "quality_flag": m.quality_flag
                }
                if not last_ts or m.ts > last_ts:
                    last_ts = m.ts

        s_out = StationOut.model_validate(s)
        s_out.latest_readings = latest
        s_out.last_reading_at = last_ts
        s_out.status = s.status if s.status else "offline"
        out.append(s_out)

    return out

@router.get("/{station_id}/measurements", response_model=List[MeasurementOut])
async def get_station_measurements(
    station_id: int, 
    parameter: str, 
    from_date: datetime = Query(..., alias="from"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Measurement).where(
        Measurement.station_id == station_id,
        Measurement.parameter == parameter,
        Measurement.ts >= from_date
    ).order_by(Measurement.ts)
    
    result = await db.execute(stmt)
    return result.scalars().all()
