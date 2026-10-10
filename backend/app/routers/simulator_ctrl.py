from fastapi import APIRouter
from pydantic import BaseModel, Field
from .. import simulator

router = APIRouter()


class SpeedBody(BaseModel):
    interval_s: int = Field(..., ge=1, le=60, description="Simulator push interval in seconds (1–60)")


@router.post("/simulator/speed")
async def set_simulator_speed(body: SpeedBody):
    simulator.set_interval(body.interval_s)
    return {"interval_s": body.interval_s}
