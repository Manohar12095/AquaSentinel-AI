import json
import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from ..db import get_db
from ..models import Incident, Station
from ..schemas import IncidentOut, IncidentSimulate

router = APIRouter()
incidents_router = APIRouter()

@incidents_router.get("", response_model=List[IncidentOut])
async def get_incidents(db: AsyncSession = Depends(get_db)):
    stmt = select(Incident).order_by(desc(Incident.started_at))
    result = await db.execute(stmt)
    incidents = result.scalars().all()
    
    out = []
    for inc in incidents:
        i_out = IncidentOut.model_validate(inc)
        i_out.hypotheses = json.loads(inc.hypotheses_json) if inc.hypotheses_json else []
        i_out.forecast = json.loads(inc.forecast_json) if inc.forecast_json else []
        out.append(i_out)
    return out

@incidents_router.post("/simulate", response_model=IncidentOut)
async def simulate_incident(req: IncidentSimulate, db: AsyncSession = Depends(get_db)):
    # Create mock forecast down the river
    stmt = select(Station)
    result = await db.execute(stmt)
    stations = {s.id: s for s in result.scalars().all()}
    
    origin = stations.get(req.origin_station_id)
    if not origin:
        raise HTTPException(status_code=404, detail="Origin station not found")
        
    forecast = []
    curr = origin
    dist = 0
    t = datetime.datetime.utcnow()
    
    while curr.downstream_station_id:
        dist += curr.reach_distance_km_to_downstream or 10.0
        # rough speed 1 m/s = 3.6 km/h
        hours = dist / 3.6
        arr_time = t + datetime.timedelta(hours=hours)
        window = [
            (arr_time - datetime.timedelta(hours=hours*0.25)).isoformat(),
            (arr_time + datetime.timedelta(hours=hours*0.25)).isoformat()
        ]
        
        curr = stations.get(curr.downstream_station_id)
        if not curr:
            break
            
        forecast.append({
            "station_id": curr.id,
            "station_name": curr.name,
            "distance_km": dist,
            "arrival_time": arr_time.isoformat(),
            "arrival_window": window,
            "confidence": "high" if hours < 5 else "medium" if hours < 24 else "low"
        })
        
    next_samples = []
    if forecast:
        next_samples.append({
            "station_id": forecast[0]["station_id"],
            "station_name": forecast[0]["station_name"],
            "reason": "Confirm plume arrival",
            "recommended_test": "Lab ICP-MS",
            "score": 0.95
        })

    inc = Incident(
        title=f"Simulated {req.type.replace('_', ' ').title()}",
        origin_station_id=req.origin_station_id,
        hypotheses_json=json.dumps([]),
        forecast_json=json.dumps(forecast)
    )
    db.add(inc)
    await db.commit()
    await db.refresh(inc)
    
    out = IncidentOut.model_validate(inc)
    out.forecast = forecast
    out.hypotheses = []
    return out

@router.get("/{incident_id}")
async def get_forecast(incident_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Incident).where(Incident.id == incident_id)
    result = await db.execute(stmt)
    inc = result.scalar_one_or_none()
    
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    forecast = json.loads(inc.forecast_json) if inc.forecast_json else []
    next_samples = []
    if forecast:
        next_samples.append({
            "station_id": forecast[0]["station_id"],
            "station_name": forecast[0]["station_name"],
            "reason": "Confirm plume arrival and track dispersion",
            "recommended_test": "Multi-parameter + Lab sampling",
            "score": 0.88
        })
        
    return {
        "forecast": forecast,
        "next_samples": next_samples
    }
