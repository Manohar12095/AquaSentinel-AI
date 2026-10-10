import time
import json
import random
import datetime
import urllib.request
import urllib.error

API_URL = "http://localhost:8000/api/ingest"
API_KEY = "dummy-key-for-now"
DEVICE_UID = "AQS-ESP32-SIM-001"
STATION_ID = 1

def generate_payload(seq):
    ph = round(random.uniform(6.5, 8.5), 2)
    tds = round(random.uniform(150, 400), 2)
    turbidity = round(random.uniform(0.1, 5.0), 2)
    temp = round(random.uniform(22.0, 26.0), 2)
    
    # Simulate a spike in turbidity occasionally
    if random.random() < 0.05:
        turbidity += random.uniform(10.0, 30.0)
        
    return {
        "device_uid": DEVICE_UID,
        "station_id": STATION_ID,
        "ts": datetime.datetime.utcnow().isoformat(),
        "seq": seq,
        "fw": "1.0.0-sim",
        "battery_pct": random.randint(70, 100),
        "rssi": random.randint(-85, -50),
        "readings": [
            {"parameter": "ph", "value": ph, "unit": "pH"},
            {"parameter": "tds_ppm", "value": tds, "unit": "ppm"},
            {"parameter": "turbidity_ntu", "value": turbidity, "unit": "NTU"},
            {"parameter": "temp_c", "value": temp, "unit": "°C"}
        ]
    }

def run_sim():
    seq = 0
    print(f"Starting ESP32 Simulator for Device {DEVICE_UID}")
    while True:
        payload = generate_payload(seq)
        data = json.dumps(payload).encode('utf-8')
        
        req = urllib.request.Request(API_URL, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        req.add_header('X-API-Key', API_KEY)
        
        try:
            with urllib.request.urlopen(req) as response:
                res_body = response.read().decode('utf-8')
                print(f"[{seq}] Sent telemetry. Response: {res_body}")
        except urllib.error.URLError as e:
            print(f"[{seq}] Error sending telemetry: {e}")
            
        seq += 1
        time.sleep(10) # Send every 10 seconds

if __name__ == "__main__":
    run_sim()
