import uuid
import secrets
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..db import get_db
from ..models import Device, User
from ..schemas import DeviceOut, DeviceKeyOut, DeviceCreate
from .auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[DeviceOut])
async def get_devices(db: AsyncSession = Depends(get_db)):
    stmt = select(Device)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=DeviceOut)
async def create_device(
    device_in: DeviceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.role not in ["admin", "operator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    stmt = select(Device).where(Device.device_uid == device_in.device_uid)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Device UID already exists")
        
    device = Device(
        device_uid=device_in.device_uid,
        type=device_in.type,
        model=device_in.model,
        firmware_version=device_in.firmware_version,
        owner_id=user.id,
        status="offline"
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@router.post("/{device_id}/generate-key", response_model=DeviceKeyOut)
async def generate_api_key(
    device_id: int, 
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.role not in ["admin", "operator"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    stmt = select(Device).where(Device.id == device_id)
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    # Generate API key
    raw_key = secrets.token_urlsafe(32)
    # In real app, hash this before storing
    device.api_key_hash = raw_key
    
    await db.commit()
    
    # Return raw key ONLY ONCE
    return {"api_key": raw_key}
