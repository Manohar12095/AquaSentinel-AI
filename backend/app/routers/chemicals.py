import json
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..db import get_db
from ..models import Chemical
from ..schemas import ChemicalOut

router = APIRouter()

@router.get("", response_model=List[ChemicalOut])
async def get_chemicals(db: AsyncSession = Depends(get_db)):
    stmt = select(Chemical)
    result = await db.execute(stmt)
    chemicals = result.scalars().all()
    
    out = []
    for c in chemicals:
        c_out = ChemicalOut.model_validate(c)
        c_out.hazards = json.loads(c.hazards_json) if c.hazards_json else []
        c_out.reference_limits = json.loads(c.reference_limits_json) if c.reference_limits_json else []
        c_out.reactions = json.loads(c.reactions_json) if c.reactions_json else []
        c_out.references = json.loads(c.references_json) if c.references_json else []
        out.append(c_out)
        
    return out
