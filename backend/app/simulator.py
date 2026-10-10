import asyncio
import random
import datetime
import math
import time
from sqlalchemy.future import select
from .db import AsyncSessionLocal
from .models import Station, Measurement
from .routers.stream import broker
from .services.alert_engine import process_readings_for_alerts
from .schemas import DevicePayloadReading

_running = False
_interval_s: float = 5  # configurable via /api/simulator/speed


def set_interval(seconds: float) -> None:
    global _interval_s
    _interval_s = max(1, float(seconds))


async def start_simulator():
    global _running
    _running = True
    asyncio.create_task(run_simulation_loop())


async def stop_simulator():
    global _running
    _running = False


async def run_simulation_loop():
    """
    Background task to generate mock telemetry for stations and push to SSE.
    Interval is controlled by _interval_s (default 5s).
    """
    while _running:
        try:
            async with AsyncSessionLocal() as db:
                stmt = select(Station)
                res = await db.execute(stmt)
                stations = res.scalars().all()

                for station in stations:
                    now = time.time()
                    ph = round(random.uniform(6.5, 8.5) + math.sin(now / 1000), 2)
                    tds = round(random.uniform(100, 300) + random.uniform(-10, 10), 2)
                    turbidity = round(random.uniform(0.5, 5.0) + random.uniform(-0.2, 0.2), 2)
                    temp = round(random.uniform(20.0, 25.0) + math.sin(now / 5000), 2)

                    readings = [
                        DevicePayloadReading(parameter="ph", value=ph, unit="pH"),
                        DevicePayloadReading(parameter="tds_ppm", value=tds, unit="ppm"),
                        DevicePayloadReading(parameter="turbidity_ntu", value=turbidity, unit="NTU"),
                        DevicePayloadReading(parameter="temp_c", value=temp, unit="°C"),
                    ]

                    ts = datetime.datetime.utcnow()

                    for r in readings:
                        m = Measurement(
                            station_id=station.id,
                            ts=ts,
                            parameter=r.parameter,
                            value=r.value,
                            unit=r.unit,
                            source="simulated",
                        )
                        db.add(m)

                    station.status = "good"
                    await db.commit()

                    await process_readings_for_alerts(station.id, readings, db)

                    event = {
                        "station_id": station.id,
                        "ts": ts.isoformat(),
                        "readings": {
                            r.parameter: {
                                "value": r.value,
                                "unit": r.unit,
                                "ts": ts.isoformat(),
                                "source": "simulated",
                                "quality_flag": "ok",
                            }
                            for r in readings
                        },
                    }
                    await broker.publish("reading", event, mode="simulation")

        except Exception as e:
            print(f"Simulator error: {e}")

        await asyncio.sleep(_interval_s)
