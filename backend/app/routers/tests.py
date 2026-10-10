import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc

from ..db import get_db
from ..models import Test, Measurement, Station
from ..schemas import TestCreate, TestOut
from ..config import settings
from .stream import broker

router = APIRouter()

@router.get("", response_model=List[TestOut])
async def get_tests(db: AsyncSession = Depends(get_db)):
    stmt = select(Test).options(selectinload(Test.measurements), selectinload(Test.chemical_results)).order_by(desc(Test.started_at))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=TestOut)
async def create_test(test_in: TestCreate, db: AsyncSession = Depends(get_db)):
    # Verify station
    stmt = select(Station).where(Station.id == test_in.station_id)
    result = await db.execute(stmt)
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
        
    t = Test(
        test_uid=f"AQS-TST-{str(uuid.uuid4())[:8].upper()}",
        station_id=test_in.station_id,
        sample_source=test_in.sample_source,
        method=test_in.method,
        notes=test_in.notes,
        status="running",
        source=settings.DATA_MODE
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t

@router.post("/{test_id}/complete", response_model=TestOut)
async def complete_test(test_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Test).options(selectinload(Test.measurements)).where(Test.id == test_id)
    result = await db.execute(stmt)
    test = result.scalar_one_or_none()
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    # Generate some mock readings for the test
    import random
    m_ph = Measurement(
        station_id=test.station_id, parameter="ph", value=round(random.uniform(6.5, 8.5), 2), unit="pH", source=test.source
    )
    m_tds = Measurement(
        station_id=test.station_id, parameter="tds_ppm", value=round(random.uniform(100, 500), 2), unit="ppm", source=test.source
    )
    m_turb = Measurement(
        station_id=test.station_id, parameter="turbidity_ntu", value=round(random.uniform(0, 10), 2), unit="NTU", source=test.source
    )
    m_temp = Measurement(
        station_id=test.station_id, parameter="temp_c", value=round(random.uniform(15, 30), 2), unit="°C", source=test.source
    )
    
    db.add_all([m_ph, m_tds, m_turb, m_temp])
    test.measurements.extend([m_ph, m_tds, m_turb, m_temp])
    
    test.status = "completed"
    test.finished_at = datetime.datetime.utcnow()
    
    await db.commit()
    await db.refresh(test)
    
    # Broadcast new test
    await broker.publish("test_completed", {"test_id": test.id}, mode="live")
    
    return test
