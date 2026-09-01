"""
CAT-SmartEnt Backend API
========================
Flask API for Smart Rental Tracking — equipment utilization tracking,
check-in/check-out, anomaly detection, demand forecasting, and
ML-based predictions.
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from sklearn.preprocessing import LabelEncoder
from database import init_db, get_db



# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "equipment.csv")
EVENTS_PATH = os.path.join(BASE_DIR, "data", "events.json")
MODEL_PATH = os.path.join(BASE_DIR, "ml", "equipment_model.pkl")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
UNDER_UTILIZATION_THRESHOLD = 30   # percentage – configurable
HIGH_UTILIZATION_THRESHOLD = 80
DUE_SOON_DAYS = 7                  # alerts for equipment due within N days
ANOMALY_Z_THRESHOLD = 1.5          # Z-score threshold for anomaly detection

# ---------------------------------------------------------------------------
# Load ML model and recreate the LabelEncoder from training data
# ---------------------------------------------------------------------------
ml_model = None
label_encoder = None


def load_ml_assets():
    """Load the trained model and recreate the label encoder."""
    global ml_model, label_encoder

    if os.path.exists(MODEL_PATH):
        ml_model = joblib.load(MODEL_PATH)
        print(f"[INFO] ML model loaded from {MODEL_PATH}")
    else:
        print(f"[WARN] ML model not found at {MODEL_PATH}")

    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        label_encoder = LabelEncoder()
        label_encoder.fit(df["equipment_type"])
        print(f"[INFO] LabelEncoder fitted on equipment types: "
              f"{list(label_encoder.classes_)}")
    else:
        print(f"[WARN] Training data not found at {DATA_PATH}")


load_ml_assets()

# Initialize SQLite database (creates tables + seeds from CSV/JSON if needed)
init_db()
print("[INFO] SQLite database initialized.")


# ---------------------------------------------------------------------------
# Events persistence (SQLite)
# ---------------------------------------------------------------------------
def load_events():
    """Load events from SQLite qr_transactions table."""
    db = get_db()
    try:
        rows = db.execute(
            "SELECT * FROM qr_transactions ORDER BY timestamp DESC"
        ).fetchall()
        events = []
        for r in rows:
            events.append({
                "event_id": f"evt_{r['transaction_id']}",
                "equipment_id": r["equipment_id"],
                "event_type": "checkout" if r["action"] == "CHECK_OUT" else "checkin",
                "operator_id": r["operator_id"],
                "site_id": r["site_id"],
                "timestamp": r["timestamp"],
                "notes": r["notes"] or "",
            })
        return events
    finally:
        db.close()


def save_event_to_db(event):
    """Save a single event to SQLite qr_transactions + usage_logs."""
    db = get_db()
    try:
        action = "CHECK_OUT" if event.get("event_type") == "checkout" else "CHECK_IN"
        db.execute(
            """INSERT INTO qr_transactions
               (equipment_id, operator_id, action, site_id, notes, timestamp)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                event["equipment_id"],
                event.get("operator_id"),
                action,
                event.get("site_id"),
                event.get("notes", ""),
                event.get("timestamp"),
            ),
        )
        db.execute(
            """INSERT INTO usage_logs
               (equipment_id, operator_id, site_id, event_type, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (
                event["equipment_id"],
                event.get("operator_id"),
                event.get("site_id"),
                event.get("event_type"),
                event.get("timestamp"),
            ),
        )
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helper: load equipment dataframe with computed columns
# ---------------------------------------------------------------------------
def load_equipment_df():
    """Load equipment from SQLite and compute utilization columns."""
    db = get_db()
    try:
        rows = db.execute("SELECT * FROM equipment").fetchall()
    finally:
        db.close()

    if not rows:
        return pd.DataFrame()

    records = [dict(r) for r in rows]
    df = pd.DataFrame(records)

    # Calculate utilization percentage
    total_hours = df["engine_hours_per_day"] + df["idle_hours_per_day"]
    df["utilization"] = np.where(
        total_hours > 0,
        (df["engine_hours_per_day"] / total_hours * 100).round(2),
        0.0,
    )

    # Classify utilization
    def classify(value):
        if value < UNDER_UTILIZATION_THRESHOLD:
            return "Under-utilized"
        elif value < HIGH_UTILIZATION_THRESHOLD:
            return "Moderately Utilized"
        else:
            return "Highly Utilized"

    df["utilization_status"] = df["utilization"].apply(classify)

    # Location status
    df["location_status"] = df["site_id"].apply(
        lambda x: "Location Missing" if pd.isna(x) or x is None or str(x).strip() == "" else "Location Available"
    )

    # Equipment status from the status column in SQLite
    # Map DB status to display status
    def map_status(s):
        if s == "CHECKED_OUT":
            return "Checked Out"
        return "Available"

    if "status" in df.columns:
        df["current_status"] = df["status"].apply(map_status)
    else:
        df["current_status"] = "Available"

    # Days until due (check_in_date relative to today)
    today = datetime.now().date()
    df["check_in_date_parsed"] = pd.to_datetime(df["check_in_date"], errors="coerce")
    df["days_until_due"] = df["check_in_date_parsed"].apply(
        lambda d: (d.date() - today).days if pd.notna(d) else None
    )

    # Total rental hours
    df["total_engine_hours"] = df["engine_hours_per_day"] * df["operating_days"]
    df["total_idle_hours"] = df["idle_hours_per_day"] * df["operating_days"]
    df["total_hours"] = df["total_engine_hours"] + df["total_idle_hours"]

    return df


def clean_record(rec):
    """Replace NaN/NaT with None for JSON serialization."""
    for key, val in rec.items():
        if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
            rec[key] = None
        elif isinstance(val, pd.Timestamp):
            rec[key] = val.isoformat() if pd.notna(val) else None
        elif isinstance(val, np.integer):
            rec[key] = int(val)
        elif isinstance(val, np.floating):
            rec[key] = float(val) if not np.isnan(val) else None
    return rec


# ---------------------------------------------------------------------------
# Helper: derive risk level and recommendation from utilization
# ---------------------------------------------------------------------------
def derive_risk_and_action(utilization):
    """Return (risk_level, recommended_action) based on predicted utilization."""
    if utilization < 20:
        return (
            "High",
            "Equipment is severely under-utilized. Consider redeploying "
            "to an active site or scheduling for maintenance/auction.",
        )
    elif utilization < 40:
        return (
            "Medium",
            "Equipment utilization is below target. Review assignment "
            "and consider relocating to a higher-demand site.",
        )
    elif utilization < 70:
        return (
            "Low",
            "Equipment is reasonably well-utilized. Continue current "
            "operations and monitor trends.",
        )
    elif utilization < 90:
        return (
            "Low",
            "Equipment is highly utilized. Ensure preventive maintenance "
            "schedules are being followed.",
        )
    else:
        return (
            "Medium",
            "Equipment may be over-utilized. Schedule downtime for "
            "inspection to prevent breakdowns.",
        )


# ---------------------------------------------------------------------------
# Helper: compute model confidence using tree-level variance
# ---------------------------------------------------------------------------
def compute_confidence(model, features):
    """
    Estimate prediction confidence from the variance across individual
    trees in the Random Forest ensemble.
    """
    feat_array = features.values if hasattr(features, "values") else features
    tree_preds = np.array(
        [tree.predict(feat_array)[0] for tree in model.estimators_]
    )
    std = np.std(tree_preds)
    confidence = round(max(0.0, min(1.0, 1.0 - std / 50.0)), 4)
    return confidence


# ---------------------------------------------------------------------------
# Generate alerts from data
# ---------------------------------------------------------------------------
def generate_alerts(df=None):
    """Generate alerts based on equipment data and business rules."""
    if df is None:
        df = load_equipment_df()

    alerts = []
    now = datetime.now(timezone.utc).isoformat()

    for _, row in df.iterrows():
        eid = row["equipment_id"]
        etype = row["equipment_type"]
        util = row["utilization"]
        loc_status = row["location_status"]
        days_due = row.get("days_until_due")
        idle_hrs = row["idle_hours_per_day"]
        operator = row.get("last_operator_id")

        # --- Overdue rental ---
        if days_due is not None and days_due < 0:
            alerts.append({
                "equipment_id": eid,
                "severity": "CRITICAL",
                "alert_type": "overdue_rental",
                "message": f"{etype} {eid} is {abs(int(days_due))} days overdue for return.",
                "recommended_action": "Immediately arrange return or formally extend the rental agreement to avoid excess charges.",
                "timestamp": now,
            })

        # --- Rental due soon ---
        if days_due is not None and 0 <= days_due <= DUE_SOON_DAYS:
            alerts.append({
                "equipment_id": eid,
                "severity": "WARNING",
                "alert_type": "due_soon",
                "message": f"{etype} {eid} is due for return in {int(days_due)} day(s).",
                "recommended_action": "Prepare equipment for return or submit a rental extension request if still needed.",
                "timestamp": now,
            })

        # --- Zero utilization (completely idle) ---
        if util == 0:
            alerts.append({
                "equipment_id": eid,
                "severity": "CRITICAL",
                "alert_type": "zero_utilization",
                "message": f"{etype} {eid} has 0% utilization — equipment is completely idle.",
                "recommended_action": "Immediately investigate. Reassign to an active project or return to avoid unnecessary rental cost.",
                "timestamp": now,
            })

        # --- Under-utilized ---
        elif util < UNDER_UTILIZATION_THRESHOLD and util > 0:
            alerts.append({
                "equipment_id": eid,
                "severity": "WARNING",
                "alert_type": "under_utilized",
                "message": f"{etype} {eid} is under-utilized at {util}% utilization.",
                "recommended_action": "Consider reallocating this equipment to a higher-demand site or adjusting the rental period.",
                "timestamp": now,
            })

        # --- Over-utilized (>= 90%) ---
        if util >= 90:
            alerts.append({
                "equipment_id": eid,
                "severity": "WARNING",
                "alert_type": "over_utilized",
                "message": f"{etype} {eid} is over-utilized at {util}% utilization.",
                "recommended_action": "Schedule preventive maintenance immediately. Prolonged over-utilization increases breakdown risk.",
                "timestamp": now,
            })

        # --- Excessive idle hours ---
        if idle_hrs >= 8:
            alerts.append({
                "equipment_id": eid,
                "severity": "WARNING",
                "alert_type": "excessive_idle",
                "message": f"{etype} {eid} has excessive idle time ({idle_hrs} hrs/day).",
                "recommended_action": "Investigate why equipment is sitting idle. Consider reassignment or return.",
                "timestamp": now,
            })

        # --- Missing operator ---
        if pd.isna(operator) or operator is None or str(operator).strip() == "":
            alerts.append({
                "equipment_id": eid,
                "severity": "INFO",
                "alert_type": "missing_operator",
                "message": f"{etype} {eid} has no operator assigned.",
                "recommended_action": "Update the equipment record with the current operator for proper accountability and tracking.",
                "timestamp": now,
            })

        # --- Missing location ---
        if loc_status == "Location Missing":
            alerts.append({
                "equipment_id": eid,
                "severity": "WARNING",
                "alert_type": "missing_location",
                "message": f"{etype} {eid} has no site location recorded.",
                "recommended_action": "Update the equipment record with the current site assignment for proper fleet tracking.",
                "timestamp": now,
            })

    # Sort: CRITICAL first, then WARNING, then INFO
    severity_order = {"CRITICAL": 0, "WARNING": 1, "INFO": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 99))

    return alerts


# ---------------------------------------------------------------------------
# Anomaly detection (Z-score statistical method)
# ---------------------------------------------------------------------------
def detect_anomalies(df=None):
    """Detect anomalies using Z-score statistical thresholding."""
    if df is None:
        df = load_equipment_df()

    anomalies = []
    now = datetime.now(timezone.utc).isoformat()

    # Compute fleet-wide statistics
    metrics = {
        "engine_hours_per_day": {
            "mean": df["engine_hours_per_day"].mean(),
            "std": df["engine_hours_per_day"].std(),
            "label": "Engine hours/day",
        },
        "idle_hours_per_day": {
            "mean": df["idle_hours_per_day"].mean(),
            "std": df["idle_hours_per_day"].std(),
            "label": "Idle hours/day",
        },
        "utilization": {
            "mean": df["utilization"].mean(),
            "std": df["utilization"].std(),
            "label": "Utilization %",
        },
        "operating_days": {
            "mean": df["operating_days"].mean(),
            "std": df["operating_days"].std(),
            "label": "Operating days",
        },
    }

    for _, row in df.iterrows():
        eid = row["equipment_id"]
        etype = row["equipment_type"]

        for metric_key, stats in metrics.items():
            value = row[metric_key]
            mean = stats["mean"]
            std = stats["std"]
            label = stats["label"]

            # Skip if std is 0 (no variation)
            if std == 0 or np.isnan(std):
                continue

            z_score = abs((value - mean) / std)

            if z_score >= ANOMALY_Z_THRESHOLD:
                # Determine anomaly type and severity
                if metric_key == "idle_hours_per_day" and value > mean:
                    anomaly_type = "Excessive idle time"
                    severity = "HIGH" if z_score >= 2.0 else "MEDIUM"
                    recommendation = (
                        "Investigate equipment allocation or operational downtime. "
                        "Consider reassigning to an active site or returning equipment."
                    )
                elif metric_key == "engine_hours_per_day" and value > mean:
                    anomaly_type = "Unusually high operating hours"
                    severity = "HIGH" if z_score >= 2.0 else "MEDIUM"
                    recommendation = (
                        "Monitor equipment health closely. Schedule preventive "
                        "maintenance to avoid costly breakdowns."
                    )
                elif metric_key == "utilization" and value < mean:
                    anomaly_type = "Abnormally low utilization"
                    severity = "HIGH" if z_score >= 2.0 else "MEDIUM"
                    recommendation = (
                        "Equipment is significantly underperforming compared to "
                        "fleet average. Review assignment and consider reallocation."
                    )
                elif metric_key == "utilization" and value > mean:
                    anomaly_type = "Abnormally high utilization"
                    severity = "MEDIUM"
                    recommendation = (
                        "Equipment usage is significantly above fleet average. "
                        "Ensure maintenance schedules are followed."
                    )
                elif metric_key == "operating_days" and value > mean:
                    anomaly_type = "Extended rental period"
                    severity = "MEDIUM"
                    recommendation = (
                        "Rental period is significantly longer than average. "
                        "Evaluate if continued rental is cost-effective."
                    )
                elif metric_key == "engine_hours_per_day" and value < mean:
                    anomaly_type = "Unusually low operating hours"
                    severity = "MEDIUM"
                    recommendation = (
                        "Equipment is running fewer hours than expected. "
                        "Verify if it is needed at the current site."
                    )
                else:
                    anomaly_type = f"Unusual {label}"
                    severity = "LOW"
                    recommendation = "Review equipment data for accuracy."

                anomalies.append({
                    "equipment_id": eid,
                    "equipment_type": etype,
                    "anomaly_type": anomaly_type,
                    "severity": severity,
                    "metric": label,
                    "detected_value": round(float(value), 2),
                    "fleet_average": round(float(mean), 2),
                    "z_score": round(float(z_score), 2),
                    "explanation": (
                        f"{etype} {eid} has {label.lower()} of {round(float(value), 2)}, "
                        f"which is {round(float(z_score), 1)} standard deviations from "
                        f"the fleet average of {round(float(mean), 2)}."
                    ),
                    "recommended_action": recommendation,
                    "timestamp": now,
                })

    # Sort by severity
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    anomalies.sort(key=lambda a: severity_order.get(a["severity"], 99))

    return anomalies


# ---------------------------------------------------------------------------
# Demand forecasting (weighted average approach)
# ---------------------------------------------------------------------------
def generate_forecast(df=None):
    """Generate demand forecast by equipment type using utilization-weighted analysis."""
    if df is None:
        df = load_equipment_df()

    forecasts = []

    for etype in df["equipment_type"].unique():
        type_df = df[df["equipment_type"] == etype]
        current_count = len(type_df)
        avg_util = type_df["utilization"].mean()
        avg_engine_hrs = type_df["engine_hours_per_day"].mean()
        avg_idle_hrs = type_df["idle_hours_per_day"].mean()
        avg_operating_days = type_df["operating_days"].mean()

        # Forecast logic: if average utilization is high, demand is likely
        # increasing; if low, demand may be decreasing
        if avg_util >= HIGH_UTILIZATION_THRESHOLD:
            # High utilization → need more equipment
            demand_multiplier = 1.0 + (avg_util - HIGH_UTILIZATION_THRESHOLD) / 100.0
            trend = "Increasing"
            trend_reason = "High average utilization suggests growing demand"
        elif avg_util >= 50:
            demand_multiplier = 1.0
            trend = "Stable"
            trend_reason = "Moderate utilization suggests stable demand"
        elif avg_util >= UNDER_UTILIZATION_THRESHOLD:
            demand_multiplier = 0.9
            trend = "Stable"
            trend_reason = "Utilization is near threshold — monitor closely"
        else:
            demand_multiplier = 0.7 + (avg_util / 100.0)
            trend = "Decreasing"
            trend_reason = "Low utilization suggests reduced demand"

        forecast_demand = max(1, round(current_count * demand_multiplier))

        # Recommended fleet size based on optimal 60-70% utilization target
        if avg_util > 0:
            optimal_count = max(1, round(current_count * avg_util / 65.0))
        else:
            optimal_count = max(1, current_count - 1)

        forecasts.append({
            "equipment_type": etype,
            "current_count": int(current_count),
            "current_demand": int(current_count),
            "forecast_demand": int(forecast_demand),
            "recommended_fleet_size": int(optimal_count),
            "avg_utilization": round(float(avg_util), 2),
            "avg_engine_hours": round(float(avg_engine_hrs), 2),
            "avg_idle_hours": round(float(avg_idle_hrs), 2),
            "avg_operating_days": round(float(avg_operating_days), 2),
            "trend": trend,
            "trend_reason": trend_reason,
        })

    return forecasts


# ---------------------------------------------------------------------------
# Smart recommendations engine
# ---------------------------------------------------------------------------
def generate_recommendations(df=None):
    """Generate smart recommendations based on all available data."""
    if df is None:
        df = load_equipment_df()

    recommendations = []
    anomalies = detect_anomalies(df)
    forecasts = generate_forecast(df)
    now = datetime.now(timezone.utc).isoformat()

    # Build forecast lookup
    forecast_map = {f["equipment_type"]: f for f in forecasts}

    for _, row in df.iterrows():
        eid = row["equipment_id"]
        etype = row["equipment_type"]
        util = row["utilization"]
        idle_hrs = row["idle_hours_per_day"]
        days_due = row.get("days_until_due")
        engine_hrs = row["engine_hours_per_day"]
        operating_days = row["operating_days"]
        operator = row.get("last_operator_id")
        fc = forecast_map.get(etype, {})

        # --- Under-utilized: recommend reallocation ---
        if util < UNDER_UTILIZATION_THRESHOLD and util > 0:
            recommendations.append({
                "equipment_id": eid,
                "category": "utilization",
                "priority": "HIGH",
                "title": f"Reallocate under-utilized {etype.lower()}",
                "message": (
                    f"{etype} {eid} has only {util}% utilization. "
                    f"Consider moving to a higher-demand site or adjusting the rental period."
                ),
                "explanation": f"Utilization ({util}%) is below the {UNDER_UTILIZATION_THRESHOLD}% threshold.",
                "timestamp": now,
            })

        # --- Zero utilization: recommend return ---
        if util == 0:
            recommendations.append({
                "equipment_id": eid,
                "category": "cost_savings",
                "priority": "CRITICAL",
                "title": f"Return idle {etype.lower()} to avoid rental costs",
                "message": (
                    f"{etype} {eid} has 0% utilization with {idle_hrs} idle hrs/day. "
                    f"Consider returning equipment to avoid unnecessary rental cost."
                ),
                "explanation": "Equipment is completely idle — accruing rental cost with no productive output.",
                "timestamp": now,
            })

        # --- Due soon ---
        if days_due is not None and 0 <= days_due <= DUE_SOON_DAYS:
            # Check if demand is increasing for this type
            if fc.get("trend") == "Increasing":
                recommendations.append({
                    "equipment_id": eid,
                    "category": "rental_extension",
                    "priority": "MEDIUM",
                    "title": f"Consider extending rental for {etype.lower()}",
                    "message": (
                        f"{etype} {eid} is due for return in {int(days_due)} day(s), "
                        f"but demand for {etype.lower()}s is increasing. "
                        f"Consider extending the rental."
                    ),
                    "explanation": f"Demand trend for {etype}: {fc.get('trend')} — {fc.get('trend_reason', '')}",
                    "timestamp": now,
                })
            else:
                recommendations.append({
                    "equipment_id": eid,
                    "category": "return_planning",
                    "priority": "MEDIUM",
                    "title": f"Prepare {etype.lower()} for return",
                    "message": (
                        f"{etype} {eid} is due for return in {int(days_due)} day(s). "
                        f"Begin return logistics and final inspection."
                    ),
                    "explanation": f"Check-in date is approaching ({int(days_due)} days remaining).",
                    "timestamp": now,
                })

        # --- Overdue ---
        if days_due is not None and days_due < 0:
            recommendations.append({
                "equipment_id": eid,
                "category": "overdue",
                "priority": "CRITICAL",
                "title": f"Overdue: return {etype.lower()} immediately",
                "message": (
                    f"{etype} {eid} is {abs(int(days_due))} days overdue. "
                    f"Return immediately or extend rental to stop accruing penalty charges."
                ),
                "explanation": f"Equipment is {abs(int(days_due))} days past the expected return date.",
                "timestamp": now,
            })

        # --- Over-utilized: schedule maintenance ---
        if util >= 90:
            recommendations.append({
                "equipment_id": eid,
                "category": "maintenance",
                "priority": "HIGH",
                "title": f"Schedule maintenance for {etype.lower()}",
                "message": (
                    f"{etype} {eid} is at {util}% utilization with {engine_hrs} engine hrs/day. "
                    f"Schedule preventive maintenance to avoid breakdowns."
                ),
                "explanation": f"Utilization ({util}%) exceeds 90% — risk of mechanical failure increases.",
                "timestamp": now,
            })

        # --- Excessive idle: investigate ---
        if idle_hrs >= 8:
            recommendations.append({
                "equipment_id": eid,
                "category": "investigation",
                "priority": "HIGH",
                "title": f"Investigate abnormal idle time for {etype.lower()}",
                "message": (
                    f"{etype} {eid} has {idle_hrs} idle hrs/day. "
                    f"Investigate why equipment is not being utilized."
                ),
                "explanation": f"Idle hours ({idle_hrs}/day) are excessive compared to engine hours ({engine_hrs}/day).",
                "timestamp": now,
            })

    # Add fleet-level recommendations from forecasts
    for fc in forecasts:
        etype = fc["equipment_type"]
        if fc["trend"] == "Increasing" and fc["forecast_demand"] > fc["current_count"]:
            recommendations.append({
                "equipment_id": None,
                "category": "fleet_planning",
                "priority": "MEDIUM",
                "title": f"High demand for {etype.lower()}s expected",
                "message": (
                    f"Current fleet: {fc['current_count']} {etype.lower()}(s). "
                    f"Forecast suggests need for {fc['forecast_demand']}. "
                    f"Consider procuring additional {etype.lower()}s."
                ),
                "explanation": fc["trend_reason"],
                "timestamp": now,
            })
        elif fc["trend"] == "Decreasing" and fc["recommended_fleet_size"] < fc["current_count"]:
            recommendations.append({
                "equipment_id": None,
                "category": "cost_savings",
                "priority": "MEDIUM",
                "title": f"Reduce {etype.lower()} fleet to save costs",
                "message": (
                    f"Current fleet: {fc['current_count']} {etype.lower()}(s) at "
                    f"{fc['avg_utilization']}% avg utilization. "
                    f"Recommended fleet size: {fc['recommended_fleet_size']}."
                ),
                "explanation": fc["trend_reason"],
                "timestamp": now,
            })

    # Sort by priority
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    recommendations.sort(key=lambda r: priority_order.get(r["priority"], 99))

    return recommendations


# ===================================================================
# ENDPOINTS
# ===================================================================


# 1. Health check -------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    """Return API health status and model availability."""
    return jsonify({
        "status": "healthy",
        "service": "CAT-SmartEnt Backend API",
        "model_loaded": ml_model is not None,
        "encoder_loaded": label_encoder is not None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# 2. Dashboard -----------------------------------------------------------
@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    """Return fleet-wide dashboard summary with full KPIs."""
    try:
        df = load_equipment_df()
        alerts = generate_alerts(df)

        checked_out = int((df["current_status"] == "Checked Out").sum())
        due_soon = int(df["days_until_due"].apply(
            lambda d: d is not None and 0 <= d <= DUE_SOON_DAYS
        ).sum()) if "days_until_due" in df.columns else 0
        overdue = int(df["days_until_due"].apply(
            lambda d: d is not None and d < 0
        ).sum()) if "days_until_due" in df.columns else 0

        total_engine_hrs = round(float(df["total_engine_hours"].sum()), 1)
        total_idle_hrs = round(float(df["total_idle_hours"].sum()), 1)

        return jsonify({
            "total_equipment": len(df),
            "currently_checked_out": checked_out,
            "due_soon": due_soon,
            "overdue": overdue,
            "under_utilized_count": int(
                (df["utilization_status"] == "Under-utilized").sum()
            ),
            "moderately_utilized_count": int(
                (df["utilization_status"] == "Moderately Utilized").sum()
            ),
            "highly_utilized_count": int(
                (df["utilization_status"] == "Highly Utilized").sum()
            ),
            "missing_location_count": int(
                (df["location_status"] == "Location Missing").sum()
            ),
            "active_alerts": len(alerts),
            "average_utilization": round(float(df["utilization"].mean()), 2),
            "total_engine_hours": total_engine_hrs,
            "total_idle_hours": total_idle_hrs,
            "total_operating_hours": round(total_engine_hrs + total_idle_hrs, 1),
        })

    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 3. List all equipment --------------------------------------------------
@app.route("/api/equipment", methods=["GET"])
def get_equipment():
    """Return all equipment with utilization metrics."""
    try:
        df = load_equipment_df()

        columns = [
            "equipment_id", "equipment_type", "site_id",
            "check_out_date", "check_in_date",
            "engine_hours_per_day", "idle_hours_per_day", "operating_days",
            "last_operator_id", "utilization", "utilization_status",
            "location_status", "current_status", "days_until_due",
            "total_engine_hours", "total_idle_hours",
        ]
        available_cols = [c for c in columns if c in df.columns]
        records = df[available_cols].to_dict(orient="records")

        for rec in records:
            clean_record(rec)

        return jsonify({
            "count": len(records),
            "equipment": records,
        })

    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 4. Single equipment details -------------------------------------------
@app.route("/api/equipment/<equipment_id>", methods=["GET"])
def get_equipment_detail(equipment_id):
    """Return details for a single equipment item with alerts, anomalies, recs."""
    try:
        df = load_equipment_df()
        match = df[df["equipment_id"] == equipment_id.upper()]

        if match.empty:
            return jsonify({
                "error": f"Equipment '{equipment_id}' not found."
            }), 404

        record = match.iloc[0].to_dict()
        clean_record(record)

        # Get history
        events = load_events()
        history = [e for e in events if e["equipment_id"] == equipment_id.upper()]
        history.sort(key=lambda e: e["timestamp"], reverse=True)

        # Get alerts for this equipment
        all_alerts = generate_alerts(df)
        eq_alerts = [a for a in all_alerts if a["equipment_id"] == equipment_id.upper()]

        # Get anomalies for this equipment
        all_anomalies = detect_anomalies(df)
        eq_anomalies = [a for a in all_anomalies if a["equipment_id"] == equipment_id.upper()]

        # Get recommendations for this equipment
        all_recs = generate_recommendations(df)
        eq_recs = [r for r in all_recs if r.get("equipment_id") == equipment_id.upper()]

        record["history"] = history
        record["alerts"] = eq_alerts
        record["anomalies"] = eq_anomalies
        record["recommendations"] = eq_recs

        return jsonify(record)

    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 5. Equipment history ---------------------------------------------------
@app.route("/api/equipment/<equipment_id>/history", methods=["GET"])
def get_equipment_history(equipment_id):
    """Return check-in/check-out history for a specific equipment."""
    try:
        events = load_events()
        history = [e for e in events if e["equipment_id"] == equipment_id.upper()]
        history.sort(key=lambda e: e["timestamp"], reverse=True)

        return jsonify({
            "equipment_id": equipment_id.upper(),
            "count": len(history),
            "events": history,
        })

    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 6. Check-out -----------------------------------------------------------
@app.route("/api/checkout", methods=["POST"])
def checkout_equipment():
    """Record an equipment check-out event. Writes to SQLite."""
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    equipment_id = data.get("equipment_id", "").upper().strip()
    operator_id = data.get("operator_id", "").strip() or None
    site_id = data.get("site_id", "").strip() or None
    notes = data.get("notes", "").strip()

    if not equipment_id:
        return jsonify({"error": "equipment_id is required."}), 400

    # Verify equipment exists in SQLite
    db = get_db()
    try:
        row = db.execute(
            "SELECT equipment_id, status FROM equipment WHERE equipment_id = ?",
            (equipment_id,),
        ).fetchone()

        if not row:
            return jsonify({"error": f"Equipment '{equipment_id}' not found."}), 404

        if row["status"] == "CHECKED_OUT":
            return jsonify({"error": f"Equipment '{equipment_id}' is already checked out."}), 409

        now = datetime.now(timezone.utc).isoformat()

        # Update equipment status
        db.execute(
            "UPDATE equipment SET status = 'CHECKED_OUT', last_operator_id = ?, site_id = ?, updated_at = ? WHERE equipment_id = ?",
            (operator_id, site_id or row["site_id"] if hasattr(row, '__getitem__') else site_id, now, equipment_id),
        )

        # Insert QR transaction
        db.execute(
            "INSERT INTO qr_transactions (equipment_id, operator_id, action, site_id, notes, timestamp) VALUES (?, ?, 'CHECK_OUT', ?, ?, ?)",
            (equipment_id, operator_id, site_id, notes or f"Checked out to {operator_id or 'unknown operator'}", now),
        )

        # Insert usage log
        db.execute(
            "INSERT INTO usage_logs (equipment_id, operator_id, site_id, event_type, timestamp) VALUES (?, ?, ?, 'checkout', ?)",
            (equipment_id, operator_id, site_id, now),
        )

        # Create rental record
        db.execute(
            "INSERT INTO rental_records (equipment_id, checkout_date, operator_id, site_id, status, created_at) VALUES (?, ?, ?, ?, 'ACTIVE', ?)",
            (equipment_id, now, operator_id, site_id, now),
        )

        db.commit()
    finally:
        db.close()

    event = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "equipment_id": equipment_id,
        "event_type": "checkout",
        "operator_id": operator_id,
        "site_id": site_id,
        "timestamp": now,
        "notes": notes or f"Checked out to {operator_id or 'unknown operator'} at {site_id or 'unknown site'}",
    }

    return jsonify({
        "message": f"Equipment {equipment_id} checked out successfully.",
        "event": event,
    }), 201


# 7. Check-in -----------------------------------------------------------
@app.route("/api/checkin", methods=["POST"])
def checkin_equipment():
    """Record an equipment check-in event. Writes to SQLite."""
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    equipment_id = data.get("equipment_id", "").upper().strip()
    notes = data.get("notes", "").strip()

    if not equipment_id:
        return jsonify({"error": "equipment_id is required."}), 400

    db = get_db()
    try:
        row = db.execute(
            "SELECT equipment_id, status FROM equipment WHERE equipment_id = ?",
            (equipment_id,),
        ).fetchone()

        if not row:
            return jsonify({"error": f"Equipment '{equipment_id}' not found."}), 404

        now_dt = datetime.now(timezone.utc)
        now = now_dt.isoformat()

        # Find the last checkout QR transaction for rental duration
        last_checkout = db.execute(
            "SELECT * FROM qr_transactions WHERE equipment_id = ? AND action = 'CHECK_OUT' ORDER BY timestamp DESC LIMIT 1",
            (equipment_id,),
        ).fetchone()

        rental_duration = None
        operator_id = None
        site_id = None
        if last_checkout:
            operator_id = last_checkout["operator_id"]
            site_id = last_checkout["site_id"]
            try:
                co_time = datetime.fromisoformat(last_checkout["timestamp"].replace("Z", "+00:00"))
                rental_duration = str(now_dt - co_time)
            except (ValueError, TypeError):
                pass

        # Update equipment status
        db.execute(
            "UPDATE equipment SET status = 'AVAILABLE', updated_at = ? WHERE equipment_id = ?",
            (now, equipment_id),
        )

        # Insert QR transaction
        db.execute(
            "INSERT INTO qr_transactions (equipment_id, operator_id, action, site_id, notes, timestamp) VALUES (?, ?, 'CHECK_IN', ?, ?, ?)",
            (equipment_id, operator_id, site_id, notes or f"Equipment returned. Duration: {rental_duration or 'N/A'}", now),
        )

        # Insert usage log
        db.execute(
            "INSERT INTO usage_logs (equipment_id, operator_id, site_id, event_type, timestamp) VALUES (?, ?, ?, 'checkin', ?)",
            (equipment_id, operator_id, site_id, now),
        )

        # Close the active rental record
        db.execute(
            "UPDATE rental_records SET actual_return_date = ?, status = 'COMPLETED' WHERE equipment_id = ? AND status = 'ACTIVE'",
            (now, equipment_id),
        )

        db.commit()
    finally:
        db.close()

    event = {
        "event_id": f"evt_{uuid.uuid4().hex[:8]}",
        "equipment_id": equipment_id,
        "event_type": "checkin",
        "operator_id": operator_id,
        "site_id": site_id,
        "timestamp": now,
        "notes": notes or f"Equipment returned. Rental duration: {rental_duration or 'N/A'}",
        "rental_duration": rental_duration,
    }

    return jsonify({
        "message": f"Equipment {equipment_id} checked in successfully.",
        "event": event,
        "rental_duration": rental_duration,
    }), 201


# 8. Alerts ---------------------------------------------------------------
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Return all active alerts based on equipment data and business rules."""
    try:
        alerts = generate_alerts()
        return jsonify({
            "count": len(alerts),
            "alerts": alerts,
        })
    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 9. Anomaly detection ---------------------------------------------------
@app.route("/api/anomalies", methods=["GET"])
def get_anomalies():
    """Return detected anomalies using Z-score statistical analysis."""
    try:
        anomalies = detect_anomalies()
        return jsonify({
            "count": len(anomalies),
            "method": "Z-score statistical thresholding",
            "threshold": ANOMALY_Z_THRESHOLD,
            "anomalies": anomalies,
        })
    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 10. Demand forecast ----------------------------------------------------
@app.route("/api/forecast", methods=["GET"])
def get_forecast():
    """Return demand forecast by equipment type."""
    try:
        forecasts = generate_forecast()
        return jsonify({
            "count": len(forecasts),
            "method": "Utilization-weighted demand analysis",
            "forecasts": forecasts,
        })
    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 11. Smart recommendations ----------------------------------------------
@app.route("/api/recommendations", methods=["GET"])
def get_recommendations():
    """Return smart recommendations based on all available data."""
    try:
        recommendations = generate_recommendations()
        return jsonify({
            "count": len(recommendations),
            "recommendations": recommendations,
        })
    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# 12. ML Prediction -------------------------------------------------------
@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Accept equipment/sensor features and return a utilization prediction
    from the trained Random Forest model.
    """
    if ml_model is None or label_encoder is None:
        return jsonify({
            "error": "ML model or encoder not loaded. "
                     "Train the model first (python ml/model.py)."
        }), 503

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    required_fields = {
        "equipment_id": str,
        "equipment_type": str,
        "engine_hours_per_day": (int, float),
        "idle_hours_per_day": (int, float),
        "operating_days": (int, float),
    }

    errors = []
    for field, expected_type in required_fields.items():
        if field not in data:
            errors.append(f"Missing required field: '{field}'")
        elif not isinstance(data[field], expected_type):
            errors.append(
                f"Invalid type for '{field}': expected "
                f"{expected_type}, got {type(data[field]).__name__}"
            )

    if errors:
        return jsonify({"errors": errors}), 400

    equipment_type = data["equipment_type"]
    known_types = list(label_encoder.classes_)
    if equipment_type not in known_types:
        return jsonify({
            "error": f"Unknown equipment_type '{equipment_type}'. "
                     f"Known types: {known_types}"
        }), 400

    if data["engine_hours_per_day"] < 0:
        errors.append("engine_hours_per_day must be >= 0")
    if data["idle_hours_per_day"] < 0:
        errors.append("idle_hours_per_day must be >= 0")
    if data["operating_days"] <= 0:
        errors.append("operating_days must be > 0")
    if data["engine_hours_per_day"] + data["idle_hours_per_day"] > 24:
        errors.append(
            "engine_hours_per_day + idle_hours_per_day cannot exceed 24"
        )

    if errors:
        return jsonify({"errors": errors}), 400

    try:
        equipment_type_encoded = label_encoder.transform(
            [equipment_type]
        )[0]

        features = pd.DataFrame([{
            "equipment_type_encoded": equipment_type_encoded,
            "engine_hours_per_day": data["engine_hours_per_day"],
            "idle_hours_per_day": data["idle_hours_per_day"],
            "operating_days": data["operating_days"],
        }])

        prediction = round(float(ml_model.predict(features)[0]), 2)
        confidence = compute_confidence(ml_model, features)
        risk_level, recommended_action = derive_risk_and_action(prediction)

        if prediction < UNDER_UTILIZATION_THRESHOLD:
            utilization_status = "Under-utilized"
        elif prediction < HIGH_UTILIZATION_THRESHOLD:
            utilization_status = "Moderately Utilized"
        else:
            utilization_status = "Highly Utilized"

        return jsonify({
            "equipment_id": data["equipment_id"],
            "prediction": prediction,
            "utilization_status": utilization_status,
            "risk_level": risk_level,
            "confidence": confidence,
            "recommended_action": recommended_action,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    except Exception as e:
        return jsonify({
            "error": f"Prediction failed: {str(e)}"
        }), 500


# 13. Analysis (kept for backward compat) --------------------------------
@app.route("/api/analysis", methods=["GET"])
def get_analysis():
    """Return a fleet-wide analysis summary."""
    try:
        df = load_equipment_df()

        equipment_analysis = df[
            [
                "equipment_id", "equipment_type", "site_id",
                "utilization", "utilization_status", "location_status",
            ]
        ].to_dict(orient="records")

        for rec in equipment_analysis:
            clean_record(rec)

        summary = {
            "total_equipment": len(df),
            "avg_utilization": round(float(df["utilization"].mean()), 2),
            "max_utilization": round(float(df["utilization"].max()), 2),
            "min_utilization": round(float(df["utilization"].min()), 2),
            "under_utilized_count": int(
                (df["utilization_status"] == "Under-utilized").sum()
            ),
            "moderately_utilized_count": int(
                (df["utilization_status"] == "Moderately Utilized").sum()
            ),
            "highly_utilized_count": int(
                (df["utilization_status"] == "Highly Utilized").sum()
            ),
            "missing_location_count": int(
                (df["location_status"] == "Location Missing").sum()
            ),
        }

        return jsonify({
            "summary": summary,
            "equipment": equipment_analysis,
        })

    except FileNotFoundError:
        return jsonify({"error": "Equipment data file not found."}), 404
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# ---------------------------------------------------------------------------
# Usage logs endpoint
# ---------------------------------------------------------------------------
@app.route("/api/usage", methods=["GET"])
def get_usage_logs():
    """Return all usage logs from SQLite."""
    try:
        db = get_db()
        rows = db.execute(
            "SELECT * FROM usage_logs ORDER BY timestamp DESC LIMIT 200"
        ).fetchall()
        db.close()
        logs = [dict(r) for r in rows]
        return jsonify({"count": len(logs), "usage_logs": logs})
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route("/api/usage/<equipment_id>", methods=["GET"])
def get_usage_by_equipment(equipment_id):
    """Return usage logs for a specific equipment."""
    try:
        db = get_db()
        rows = db.execute(
            "SELECT * FROM usage_logs WHERE equipment_id = ? ORDER BY timestamp DESC",
            (equipment_id.upper(),),
        ).fetchall()
        db.close()
        logs = [dict(r) for r in rows]
        return jsonify({"equipment_id": equipment_id.upper(), "count": len(logs), "usage_logs": logs})
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# ---------------------------------------------------------------------------
# Equipment CRUD
# ---------------------------------------------------------------------------
@app.route("/api/equipment", methods=["POST"])
def create_equipment():
    """Create a new equipment record in SQLite."""
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    equipment_id = data.get("equipment_id", "").upper().strip()
    equipment_type = data.get("equipment_type", "").strip()

    if not equipment_id or not equipment_type:
        return jsonify({"error": "equipment_id and equipment_type are required."}), 400

    now = datetime.now(timezone.utc).isoformat()
    db = get_db()
    try:
        existing = db.execute("SELECT equipment_id FROM equipment WHERE equipment_id = ?", (equipment_id,)).fetchone()
        if existing:
            return jsonify({"error": f"Equipment '{equipment_id}' already exists."}), 409

        db.execute(
            """INSERT INTO equipment
               (equipment_id, equipment_type, site_id, engine_hours_per_day,
                idle_hours_per_day, operating_days, last_operator_id, status,
                created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)""",
            (
                equipment_id,
                equipment_type,
                data.get("site_id"),
                float(data.get("engine_hours_per_day", 0)),
                float(data.get("idle_hours_per_day", 0)),
                int(data.get("operating_days", 0)),
                data.get("last_operator_id"),
                now,
                now,
            ),
        )
        db.commit()
    finally:
        db.close()

    return jsonify({"message": f"Equipment {equipment_id} created.", "equipment_id": equipment_id}), 201


@app.route("/api/equipment/<equipment_id>", methods=["PUT"])
def update_equipment(equipment_id):
    """Update an existing equipment record in SQLite."""
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    equipment_id = equipment_id.upper().strip()
    now = datetime.now(timezone.utc).isoformat()

    db = get_db()
    try:
        existing = db.execute("SELECT equipment_id FROM equipment WHERE equipment_id = ?", (equipment_id,)).fetchone()
        if not existing:
            return jsonify({"error": f"Equipment '{equipment_id}' not found."}), 404

        # Build SET clause from provided fields
        allowed = ["equipment_type", "site_id", "engine_hours_per_day", "idle_hours_per_day",
                   "operating_days", "last_operator_id", "status", "check_out_date", "check_in_date"]
        updates = []
        values = []
        for field in allowed:
            if field in data:
                updates.append(f"{field} = ?")
                values.append(data[field])

        if not updates:
            return jsonify({"error": "No valid fields to update."}), 400

        updates.append("updated_at = ?")
        values.append(now)
        values.append(equipment_id)

        db.execute(f"UPDATE equipment SET {', '.join(updates)} WHERE equipment_id = ?", values)
        db.commit()
    finally:
        db.close()

    return jsonify({"message": f"Equipment {equipment_id} updated."})


# ---------------------------------------------------------------------------
# Global error handlers
# ---------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed."}), 405


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error."}), 500


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

