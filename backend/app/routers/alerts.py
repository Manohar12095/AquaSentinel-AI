from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
import json

from ..db import get_db
from ..models import Alert, AlertRule, Station
from ..schemas import AlertOut, AlertRuleOut, AlertRuleUpdate

router = APIRouter()
rules_router = APIRouter()

@router.get("", response_model=List[AlertOut])
async def get_alerts(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Alert, Station).join(Station, Alert.station_id == Station.id).order_by(desc(Alert.created_at))
    if status:
        stmt = stmt.where(Alert.status == status)
        
    result = await db.execute(stmt)
    rows = result.all()
    
    out = []
    for alert, station in rows:
        a_out = AlertOut.model_validate(alert)
        a_out.station_name = station.name
        a_out.evidence = json.loads(alert.evidence_json) if alert.evidence_json else {}
        out.append(a_out)
        
    return out

@router.post("/{alert_id}/ack")
async def ack_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Alert).where(Alert.id == alert_id)
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = "acknowledged"
    # in real app, set acknowledged_by from user
    await db.commit()
    return {"status": "ok"}

@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Alert).where(Alert.id == alert_id)
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = "resolved"
    await db.commit()
    return {"status": "ok"}

@rules_router.get("", response_model=List[AlertRuleOut])
async def get_alert_rules(db: AsyncSession = Depends(get_db)):
    stmt = select(AlertRule)
    result = await db.execute(stmt)
    return result.scalars().all()

@rules_router.put("/{rule_id}", response_model=AlertRuleOut)
async def update_alert_rule(rule_id: int, update: AlertRuleUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(AlertRule).where(AlertRule.id == rule_id)
    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    rule.enabled = update.enabled
    await db.commit()
    await db.refresh(rule)
    return rule
