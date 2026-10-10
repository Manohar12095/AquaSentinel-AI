from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import json
import datetime
from typing import List
from ..models import AlertRule, Alert, Station
from ..schemas import DevicePayloadReading
from ..routers.stream import broker

async def process_readings_for_alerts(station_id: int, readings: List[DevicePayloadReading], db: AsyncSession):
    # Fetch active rules
    stmt = select(AlertRule).where(AlertRule.enabled == True)
    result = await db.execute(stmt)
    rules = result.scalars().all()
    
    stmt_station = select(Station).where(Station.id == station_id)
    res_st = await db.execute(stmt_station)
    station = res_st.scalar_one_or_none()
    station_name = station.name if station else f"Station {station_id}"

    worst_severity = "good"

    for r in readings:
        if r.quality == "bad":
            continue
            
        for rule in rules:
            if rule.parameter == r.parameter:
                triggered = False
                severity = None
                
                # Check critical first
                if rule.operator == ">" and r.value > rule.crit_value:
                    triggered, severity = True, "critical"
                elif rule.operator == "<" and r.value < rule.crit_value:
                    triggered, severity = True, "critical"
                # Then check warning
                elif not triggered and rule.operator == ">" and r.value > rule.warn_value:
                    triggered, severity = True, "warning"
                elif not triggered and rule.operator == "<" and r.value < rule.warn_value:
                    triggered, severity = True, "warning"
                    
                if triggered:
                    # Very basic debouncing: check if open alert already exists
                    stmt_alert = select(Alert).where(
                        Alert.station_id == station_id,
                        Alert.parameter == r.parameter,
                        Alert.status == "open",
                        Alert.severity == severity
                    )
                    res_al = await db.execute(stmt_alert)
                    existing = res_al.scalar_one_or_none()
                    
                    if not existing:
                        new_alert = Alert(
                            station_id=station_id,
                            parameter=r.parameter,
                            rule_id=rule.id,
                            severity=severity,
                            kind="anomaly",
                            evidence_json=json.dumps({
                                "value": r.value,
                                "unit": r.unit,
                                "threshold": rule.crit_value if severity == "critical" else rule.warn_value,
                                "timestamp": datetime.datetime.utcnow().isoformat()
                            }),
                            message=f"{r.parameter.upper()} {severity}: {r.value} {r.unit}",
                            recommended_action=f"Check {r.parameter} sensor or inspect water body."
                        )
                        db.add(new_alert)
                        await db.commit()
                        await db.refresh(new_alert)
                        
                        # Push event
                        alert_data = {
                            "id": new_alert.id,
                            "station_id": station_id,
                            "station_name": station_name,
                            "parameter": r.parameter,
                            "severity": severity,
                            "kind": "anomaly",
                            "message": new_alert.message,
                            "status": "open",
                            "created_at": new_alert.created_at.isoformat(),
                        }
                        await broker.publish("alert", alert_data, mode="live") # Publish to both actually
                    
                    if severity == "critical":
                        worst_severity = "critical"
                    elif severity == "warning" and worst_severity != "critical":
                        worst_severity = "warning"
                        
    # Update station status if needed
    if worst_severity != "good" and station:
        station.status = worst_severity
        await db.commit()
        await broker.publish("station_status", {"station_id": station_id, "status": worst_severity})
