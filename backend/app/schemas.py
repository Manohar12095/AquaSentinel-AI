from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class Login(BaseModel):
    email: str
    password: str

class DevicePayloadReading(BaseModel):
    parameter: str
    value: float
    unit: str
    raw: Optional[float] = None
    quality: Optional[str] = "ok"

class DevicePayload(BaseModel):
    device_uid: str
    station_id: int
    ts: datetime
    seq: int
    fw: str
    battery_pct: Optional[int] = None
    rssi: Optional[int] = None
    readings: List[DevicePayloadReading]

class MeasurementOut(BaseModel):
    id: int
    station_id: int
    ts: datetime
    parameter: str
    value: float
    unit: str
    quality_flag: str
    source: str
    model_config = ConfigDict(from_attributes=True)

class StationBase(BaseModel):
    name: str
    water_body_type: str
    water_body_name: str
    lat: float
    lon: float
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    reporting_interval_s: int
    stale_after_s: int

class StationOut(StationBase):
    id: int
    status: str = "offline"
    last_reading_at: Optional[datetime] = None
    latest_readings: Dict[str, Any] = {}
    model_config = ConfigDict(from_attributes=True)

class ChemicalBase(BaseModel):
    name: str
    formula: str
    cas_number: str
    pubchem_cid: Optional[int] = None
    molar_mass: float

class ChemicalOut(ChemicalBase):
    id: int
    hazards: List[str] = []
    reference_limits: List[Dict[str, Any]] = []
    reactions: List[str] = []
    references: List[str] = []
    last_reviewed: str
    model_config = ConfigDict(from_attributes=True)

class AlertRuleOut(BaseModel):
    id: int
    scope: str
    parameter: str
    operator: str
    warn_value: float
    crit_value: float
    min_duration_s: int
    enabled: bool
    rationale: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class AlertRuleUpdate(BaseModel):
    enabled: bool

class AlertOut(BaseModel):
    id: int
    station_id: int
    station_name: str = ""
    parameter: str
    severity: str
    kind: str
    message: str
    recommended_action: Optional[str] = None
    status: str
    created_at: datetime
    acknowledged_by: Optional[str] = None
    evidence: Dict[str, Any] = {}
    model_config = ConfigDict(from_attributes=True)

class TestCreate(BaseModel):
    station_id: int
    sample_source: str
    method: str
    notes: Optional[str] = None

class TestOut(BaseModel):
    id: int
    test_uid: str
    station_id: int
    sample_source: str
    method: str
    status: str
    source: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    notes: Optional[str] = None
    readings: List[MeasurementOut] = []
    chemical_results: List[Any] = []
    model_config = ConfigDict(from_attributes=True)

class DashboardSummaryOut(BaseModel):
    total_stations: int
    online_stations: int
    offline_stations: int
    tests_today: int
    open_warnings: int
    open_criticals: int
    open_incidents: int
    trend_ph: Optional[float] = None
    trend_tds: Optional[float] = None
    trend_turbidity: Optional[float] = None
    trend_temp: Optional[float] = None

class IncidentOut(BaseModel):
    id: int
    title: str
    origin_station_id: int
    started_at: datetime
    status: str
    hypotheses: List[Dict[str, Any]] = []
    forecast: List[Dict[str, Any]] = []
    outcome: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class IncidentSimulate(BaseModel):
    origin_station_id: int
    type: str

class BlogPostOut(BaseModel):
    id: int
    author_id: int
    author_name: str = ""
    title: str
    body_md: str
    tags: List[str] = []
    references: List[str] = []
    status: str
    moderation_note: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
    
class BlogPostCreate(BaseModel):
    title: str
    body_md: str
    tags: List[str] = []

class BlogPostModerate(BaseModel):
    action: str

class DeviceCreate(BaseModel):
    device_uid: str
    type: str
    model: str
    firmware_version: str

class DeviceOut(BaseModel):
    id: int
    device_uid: str
    type: str
    model: str
    firmware_version: str
    owner_id: int
    station_id: Optional[int] = None
    battery_pct: Optional[int] = None
    rssi: Optional[int] = None
    last_seen_at: Optional[datetime] = None
    status: str
    model_config = ConfigDict(from_attributes=True)

class DeviceKeyOut(BaseModel):
    api_key: str
