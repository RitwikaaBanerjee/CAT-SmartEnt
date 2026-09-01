# CAT-SmartEnt

Smart equipment utilization and intelligence platform for Caterpillar.

## Overview

CAT-SmartEnt tracks heavy construction equipment (Excavators, Cranes, Bulldozers, Graders), analyses their utilization patterns, and uses a trained machine-learning model to predict utilization and flag risk levels — helping fleet managers make data-driven decisions.

---

## Project Structure

```
CAT-SmartEnt/
├── backend/
│   ├── app.py               # Flask API server
│   └── requirements.txt     # Python dependencies
├── data/
│   └── equipment.csv        # Equipment dataset
├── ml/
│   ├── model.py             # ML model training script
│   ├── analyze.py           # Data analysis script
│   └── equipment_model.pkl  # Trained Random Forest model
├── frontend/                # React frontend (TBD)
├── .gitignore
└── README.md
```

---

## Backend Setup

### Prerequisites

- Python 3.9+
- pip

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/RitwikaaBanerjee/CAT-SmartEnt.git
cd CAT-SmartEnt

# 2. Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r backend/requirements.txt
```

### Train the ML model (if needed)

```bash
python ml/model.py
```

This trains a Random Forest Regressor on `data/equipment.csv` and saves the model to `ml/equipment_model.pkl`.

### Start the backend server

```bash
python backend/app.py
```

The server starts at **http://localhost:5000**.

---

## API Endpoints

| Method | Endpoint                      | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | `/api/health`                 | Health check & model status              |
| GET    | `/api/equipment`              | List all equipment with utilization data |
| GET    | `/api/equipment/<equipment_id>` | Get details for a single equipment item |
| POST   | `/api/predict`                | ML-based utilization prediction          |
| GET    | `/api/analysis`               | Fleet-wide analysis and summary stats    |

---

## API Reference

### GET `/api/health`

Returns the health status of the API.

**Response:**

```json
{
  "status": "healthy",
  "service": "CAT-SmartEnt Backend API",
  "model_loaded": true,
  "encoder_loaded": true,
  "timestamp": "2026-09-01T10:00:00+00:00"
}
```

---

### GET `/api/equipment`

Returns all equipment records with computed utilization.

**Response:**

```json
{
  "count": 7,
  "equipment": [
    {
      "equipment_id": "EXQ1001",
      "equipment_type": "Excavator",
      "site_id": "S003",
      "utilization": 13.04,
      "utilization_status": "Under-utilized",
      "location_status": "Location Available",
      "engine_hours_per_day": 1.5,
      "idle_hours_per_day": 10.0,
      "operating_days": 15,
      "check_out_date": "2025-04-01",
      "check_in_date": "2025-04-16",
      "last_operator_id": "OP101"
    }
  ]
}
```

---

### GET `/api/equipment/<equipment_id>`

Returns details for one equipment item.

**Example:** `GET /api/equipment/EXQ1003`

**Response:**

```json
{
  "equipment_id": "EXQ1003",
  "equipment_type": "Bulldozer",
  "site_id": "S002",
  "utilization": 93.75,
  "utilization_status": "Highly Utilized",
  "location_status": "Location Available",
  "engine_hours_per_day": 7.5,
  "idle_hours_per_day": 0.5,
  "operating_days": 25,
  "check_out_date": "2025-02-15",
  "check_in_date": "2025-03-11",
  "last_operator_id": "OP203"
}
```

---

### POST `/api/predict`

Predict utilization and risk level for given equipment parameters.

**Request body (JSON):**

```json
{
  "equipment_id": "EXQ1001",
  "equipment_type": "Excavator",
  "engine_hours_per_day": 5.0,
  "idle_hours_per_day": 3.0,
  "operating_days": 20
}
```

| Field                  | Type   | Required | Description                                 |
|------------------------|--------|----------|---------------------------------------------|
| `equipment_id`         | string | Yes      | Identifier for the equipment                |
| `equipment_type`       | string | Yes      | One of: Bulldozer, Crane, Excavator, Grader |
| `engine_hours_per_day` | number | Yes      | Active engine hours per day (≥ 0)           |
| `idle_hours_per_day`   | number | Yes      | Idle hours per day (≥ 0)                    |
| `operating_days`       | number | Yes      | Number of operating days (> 0)              |

**Response:**

```json
{
  "equipment_id": "EXQ1001",
  "prediction": 62.5,
  "risk_level": "Low",
  "confidence": 0.92,
  "recommended_action": "Equipment is reasonably well-utilized. Continue current operations and monitor trends.",
  "timestamp": "2026-09-01T10:05:00+00:00"
}
```

**Error responses:**

- `400` — Missing or invalid fields
- `503` — ML model not loaded

---

### GET `/api/analysis`

Returns fleet-wide utilization analysis.

**Response:**

```json
{
  "summary": {
    "total_equipment": 7,
    "avg_utilization": 42.35,
    "max_utilization": 100.0,
    "min_utilization": 0.0,
    "under_utilized_count": 3,
    "moderately_utilized_count": 2,
    "highly_utilized_count": 2,
    "missing_location_count": 2
  },
  "equipment": [ ... ]
}
```

---

## Tech Stack

- **Backend:** Python, Flask, Flask-CORS
- **ML:** scikit-learn (Random Forest Regressor)
- **Data:** pandas, NumPy
- **Frontend:** React (planned)

---

## License

This project was built for the Caterpillar hackathon.
