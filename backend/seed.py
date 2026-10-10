import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.config import settings
from app.models import User, Station, Chemical, AlertRule
from app.routers.auth import get_password_hash

async def seed_db():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Seed Users
        u1 = User(name="Admin User", email="admin@aquasentinel.local", password_hash=get_password_hash("admin123"), role="admin")
        u2 = User(name="Test Family", email="family@aquasentinel.local", password_hash=get_password_hash("family123"), role="family")
        session.add_all([u1, u2])
        
        # Seed Stations (Tamil Nadu Network)
        # Cauvery Basin
        s1 = Station(name="Mettur Dam", water_body_type="dam", water_body_name="Cauvery", lat=11.8000, lon=77.8000, district="Salem")
        s2 = Station(name="Erode Checkpoint", water_body_type="river", water_body_name="Cauvery", lat=11.3500, lon=77.7300, district="Erode")
        s3 = Station(name="Trichy Grand Anicut", water_body_type="river", water_body_name="Cauvery", lat=10.8200, lon=78.7000, district="Trichy")
        s4 = Station(name="Poompuhar Estuary", water_body_type="river", water_body_name="Cauvery", lat=11.1400, lon=79.8500, district="Mayiladuthurai")

        # Vaigai Basin
        s5 = Station(name="Vaigai Dam", water_body_type="dam", water_body_name="Vaigai", lat=10.0500, lon=77.5800, district="Theni")
        s6 = Station(name="Madurai City", water_body_type="river", water_body_name="Vaigai", lat=9.9300, lon=78.1200, district="Madurai")
        s7 = Station(name="Ramanathapuram", water_body_type="river", water_body_name="Vaigai", lat=9.3700, lon=78.8300, district="Ramanathapuram")

        # Thamirabarani Basin
        s8 = Station(name="Papanasam Dam", water_body_type="dam", water_body_name="Thamirabarani", lat=8.7000, lon=77.3800, district="Tirunelveli")
        s9 = Station(name="Tirunelveli Junction", water_body_type="river", water_body_name="Thamirabarani", lat=8.7300, lon=77.7000, district="Tirunelveli")
        s10 = Station(name="Punnaikayal Coast", water_body_type="river", water_body_name="Thamirabarani", lat=8.6300, lon=78.1200, district="Thoothukudi")

        # Chennai Region
        s11 = Station(name="Chembarambakkam", water_body_type="lake", water_body_name="Chembarambakkam Lake", lat=13.0100, lon=80.0500, district="Chennai")
        s12 = Station(name="Adyar River", water_body_type="river", water_body_name="Adyar", lat=13.0100, lon=80.2500, district="Chennai")
        s13 = Station(name="Cooum River", water_body_type="river", water_body_name="Cooum", lat=13.0600, lon=80.2800, district="Chennai")
        s14 = Station(name="Palar Kanchipuram", water_body_type="river", water_body_name="Palar", lat=12.8000, lon=79.7000, district="Kanchipuram")

        # Other Key Lakes/Reservoirs
        s15 = Station(name="Ooty Lake", water_body_type="lake", water_body_name="Ooty Lake", lat=11.4000, lon=76.6800, district="Nilgiris")
        s16 = Station(name="Kodaikanal Lake", water_body_type="lake", water_body_name="Kodaikanal Lake", lat=10.2300, lon=77.4800, district="Dindigul")
        s17 = Station(name="Bhavanisagar Dam", water_body_type="dam", water_body_name="Bhavani", lat=11.4700, lon=77.1200, district="Erode")
        s18 = Station(name="Pechiparai Dam", water_body_type="dam", water_body_name="Kodayar", lat=8.4500, lon=77.3000, district="Kanyakumari")
        
        session.add_all([s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18])
        await session.commit()
        
        # Link Cauvery river chain
        s1.downstream_station_id = s2.id
        s2.upstream_station_id = s1.id
        s2.downstream_station_id = s3.id
        s3.upstream_station_id = s2.id
        s3.downstream_station_id = s4.id
        s4.upstream_station_id = s3.id

        # Link Vaigai river chain
        s5.downstream_station_id = s6.id
        s6.upstream_station_id = s5.id
        s6.downstream_station_id = s7.id
        s7.upstream_station_id = s6.id

        # Link Thamirabarani river chain
        s8.downstream_station_id = s9.id
        s9.upstream_station_id = s8.id
        s9.downstream_station_id = s10.id
        s10.upstream_station_id = s9.id

        await session.commit()
        
        # Seed Alert Rules
        rules = [
            AlertRule(parameter="ph", operator="<", warn_value=6.5, crit_value=6.0, rationale="WHO limit"),
            AlertRule(parameter="ph", operator=">", warn_value=8.5, crit_value=9.0, rationale="WHO limit"),
            AlertRule(parameter="tds_ppm", operator=">", warn_value=500, crit_value=1000, rationale="Drinking limit"),
            AlertRule(parameter="turbidity_ntu", operator=">", warn_value=5.0, crit_value=10.0, rationale="Turbidity spikes indicate runoff"),
        ]
        session.add_all(rules)
        
        # Seed Chemicals
        c1 = Chemical(
            name="Lead", formula="Pb", cas_number="7439-92-1", pubchem_cid=5352425, molar_mass=207.2,
            hazards_json=json.dumps(["Neurotoxin", "Developmental hazard"]),
            reference_limits_json=json.dumps([{"use": "Drinking", "value": 0.01, "unit": "mg/L", "source": "WHO"}]),
            last_reviewed="2023-10-01"
        )
        c2 = Chemical(
            name="Arsenic", formula="As", cas_number="7440-38-2", pubchem_cid=5359596, molar_mass=74.92,
            hazards_json=json.dumps(["Carcinogen", "Toxic"]),
            reference_limits_json=json.dumps([{"use": "Drinking", "value": 0.01, "unit": "mg/L", "source": "WHO"}]),
            last_reviewed="2023-10-01"
        )
        c3 = Chemical(
            name="Nitrate", formula="NO3-", cas_number="14797-55-8", pubchem_cid=943, molar_mass=62.0,
            hazards_json=json.dumps(["Blue baby syndrome (infants)"]),
            reference_limits_json=json.dumps([{"use": "Drinking", "value": 50.0, "unit": "mg/L", "source": "WHO"}]),
            last_reviewed="2023-10-01"
        )
        session.add_all([c1, c2, c3])
        await session.commit()
        
    print("Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_db())
