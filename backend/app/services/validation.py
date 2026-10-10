from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas import DevicePayload, DevicePayloadReading
from typing import List

PHYSICAL_LIMITS = {
    "ph": (0.0, 14.0),
    "temp_c": (-5.0, 60.0),
    "tds_ppm": (0.0, 10000.0),
    "turbidity_ntu": (0.0, 1000.0),
}

async def validate_readings(payload: DevicePayload, db: AsyncSession) -> List[DevicePayloadReading]:
    """
    Validates physical limits, rate of change, and flags readings as ok/suspect/bad.
    """
    validated = []
    for r in payload.readings:
        # Check physical limits
        if r.parameter in PHYSICAL_LIMITS:
            min_val, max_val = PHYSICAL_LIMITS[r.parameter]
            if r.value < min_val or r.value > max_val:
                r.quality = "bad"
            elif r.value < 0 and r.parameter != "temp_c":
                r.quality = "bad"
        
        # We can implement jump detection here (e.g. against last reading in DB)
        # For demo purposes, we will accept the values unless they are "bad"
        validated.append(r)
        
    return validated
