visit At : https://air-prediction-9fgbrchtwu2k8dqox3v8dg.streamlit.app

# AquaSentinel AI

An end-to-end IoT water-quality monitoring platform designed to ingest live environmental telemetry, alert on critical thresholds, and provide actionable intelligence.

## Features
- **Real-Time Dashboard**: See live water quality metrics streamed via Server-Sent Events (SSE).
- **Interactive Live Map**: View sensor stations along river chains with real-time status indicators.
- **Test Laboratory**: Run multi-parameter tests and generate simulated chemical reports.
- **Pollution Forecast**: Simulate pollution incidents and model downstream arrival times (Time Machine & Recommender).
- **Chemical Intelligence**: Search for contaminants, reference limits, and evaluate suspected anomalies.
- **Research Blog**: Collaborative space for researchers to publish peer-reviewed findings based on the data.
- **Alerts & Devices**: View live anomalies, manage threshold rules, and register edge IoT devices (e.g. ESP32).

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v3, Zustand, Recharts, Leaflet
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy (Async), SQLite
- **Architecture**: Monolithic service with a live stream broker architecture via SSE

## Quick Start
You can launch the entire stack using the provided batch file:
1. Double-click `start_aquasentinel.bat`
2. Wait a few seconds for the servers to initialize.
3. The frontend is accessible at [http://localhost:5173](http://localhost:5173)

### Manual Startup

**Backend:**
```bash
cd backend
.\venv\Scripts\python.exe run.py
```
*API available at http://localhost:8000*

**Frontend:**
```bash
cd frontend
npm run dev
```
*UI available at http://localhost:5173*

## Login Credentials
The SQLite database was pre-seeded with the following mock users:
- **Admin**: `admin@aquasentinel.local` / `admin123`
- **Family**: `family@aquasentinel.local` / `family123`

## ESP32 Simulator
To simulate hardware pushing data to the API:
```bash
cd firmware
python esp32_sim.py
```
This script acts like a real hardware device, posting JSON payloads to the `/api/ingest` endpoint.
