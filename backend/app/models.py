import datetime
import json
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Table
from sqlalchemy.orm import relationship
from .db import Base

# Association Tables
test_measurements = Table(
    'test_measurements',
    Base.metadata,
    Column('test_id', Integer, ForeignKey('tests.id')),
    Column('measurement_id', Integer, ForeignKey('measurements.id'))
)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False) # 'family', 'researcher', 'operator', 'admin'

class Device(Base):
    __tablename__ = 'devices'
    id = Column(Integer, primary_key=True, index=True)
    device_uid = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False) # 'home', 'commercial'
    model = Column(String)
    firmware_version = Column(String)
    api_key_hash = Column(String)
    owner_id = Column(Integer, ForeignKey('users.id'))
    station_id = Column(Integer, ForeignKey('stations.id'), nullable=True)
    battery_pct = Column(Integer, nullable=True)
    rssi = Column(Integer, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    status = Column(String, default="offline")
    
    owner = relationship("User")
    station = relationship("Station", back_populates="devices")

class Station(Base):
    __tablename__ = 'stations'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    water_body_type = Column(String, nullable=False) 
    water_body_name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    district = Column(String)
    state = Column(String)
    country = Column(String)
    upstream_station_id = Column(Integer, ForeignKey('stations.id'), nullable=True)
    downstream_station_id = Column(Integer, ForeignKey('stations.id'), nullable=True)
    reach_distance_km_to_downstream = Column(Float, nullable=True)
    reporting_interval_s = Column(Integer, default=300)
    stale_after_s = Column(Integer, default=900)
    status = Column(String, default="offline")
    
    devices = relationship("Device", back_populates="station")

class Measurement(Base):
    __tablename__ = 'measurements'
    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey('stations.id'), index=True)
    device_id = Column(Integer, ForeignKey('devices.id'), nullable=True)
    ts = Column(DateTime, index=True, default=datetime.datetime.utcnow)
    parameter = Column(String, index=True, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    quality_flag = Column(String, default="ok") # 'ok', 'suspect', 'bad'
    source = Column(String, nullable=False) # 'live', 'simulated', 'lab'

class Test(Base):
    __tablename__ = 'tests'
    id = Column(Integer, primary_key=True, index=True)
    test_uid = Column(String, unique=True, index=True, nullable=False)
    station_id = Column(Integer, ForeignKey('stations.id'), nullable=True)
    device_id = Column(Integer, ForeignKey('devices.id'), nullable=True)
    sample_source = Column(String)
    method = Column(String)
    status = Column(String) # running, completed, failed
    source = Column(String) # live, simulated
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    
    measurements = relationship("Measurement", secondary=test_measurements)
    chemical_results = relationship("ChemicalResult", back_populates="test")

class Chemical(Base):
    __tablename__ = 'chemicals'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    formula = Column(String)
    cas_number = Column(String)
    pubchem_cid = Column(Integer, nullable=True)
    molar_mass = Column(Float)
    hazards_json = Column(Text, default="[]")
    reference_limits_json = Column(Text, default="[]")
    reactions_json = Column(Text, default="[]")
    references_json = Column(Text, default="[]")
    last_reviewed = Column(String)

class ChemicalResult(Base):
    __tablename__ = 'chemical_results'
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey('tests.id'), nullable=True)
    station_id = Column(Integer, ForeignKey('stations.id'), nullable=True)
    chemical_id = Column(Integer, ForeignKey('chemicals.id'))
    concentration = Column(Float)
    unit = Column(String)
    method = Column(String)
    detection_limit = Column(Float)
    identification_status = Column(String)
    evidence_json = Column(Text, default="{}")
    lab_report_url = Column(String, nullable=True)
    ts = Column(DateTime, default=datetime.datetime.utcnow)
    
    test = relationship("Test", back_populates="chemical_results")
    chemical = relationship("Chemical")

class AlertRule(Base):
    __tablename__ = 'alert_rules'
    id = Column(Integer, primary_key=True, index=True)
    scope = Column(String, default="global")
    parameter = Column(String, nullable=False)
    operator = Column(String, nullable=False) # >, <, >=, <=
    warn_value = Column(Float, nullable=False)
    crit_value = Column(Float, nullable=False)
    min_duration_s = Column(Integer, default=0)
    enabled = Column(Boolean, default=True)
    rationale = Column(String, nullable=True)

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey('stations.id'), index=True)
    parameter = Column(String, nullable=False)
    rule_id = Column(Integer, ForeignKey('alert_rules.id'), nullable=True)
    severity = Column(String, nullable=False) # info, warning, critical
    kind = Column(String, nullable=False) # anomaly, verified_incident
    evidence_json = Column(Text, default="{}")
    message = Column(String, nullable=False)
    recommended_action = Column(String, nullable=True)
    status = Column(String, default="open") # open, acknowledged, resolved
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    acknowledged_by = Column(String, nullable=True)

    station = relationship("Station")

class Incident(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    origin_station_id = Column(Integer, ForeignKey('stations.id'))
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="active") # active, monitoring, resolved
    hypotheses_json = Column(Text, default="[]")
    forecast_json = Column(Text, default="[]")
    outcome = Column(Text, nullable=True)
    
    origin_station = relationship("Station")

class Calibration(Base):
    __tablename__ = 'calibrations'
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey('devices.id'))
    sensor = Column(String, nullable=False)
    performed_at = Column(DateTime, default=datetime.datetime.utcnow)
    method = Column(String)
    reference_solutions_json = Column(Text, default="[]")
    slope = Column(Float)
    offset = Column(Float)
    performed_by = Column(String)

class BlogPost(Base):
    __tablename__ = 'blog_posts'
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey('users.id'))
    title = Column(String, nullable=False)
    body_md = Column(Text, nullable=False)
    tags_json = Column(Text, default="[]")
    references_json = Column(Text, default="[]")
    status = Column(String, default="draft") # draft, pending, published, rejected
    moderation_note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    station_id = Column(Integer, ForeignKey('stations.id'), nullable=True)
    incident_id = Column(Integer, ForeignKey('incidents.id'), nullable=True)
    
    author = relationship("User")

class Report(Base):
    __tablename__ = 'reports'
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey('tests.id'), nullable=True)
    incident_id = Column(Integer, ForeignKey('incidents.id'), nullable=True)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
