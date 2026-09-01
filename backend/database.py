"""
CAT-SmartEnt Database Module
=============================
SQLite database layer for the Smart Rental Tracking System.

Usage:
    from database import init_db, get_db

    # Call once at startup:
    init_db()

    # In request handlers:
    db = get_db()
    rows = db.execute("SELECT * FROM equipment").fetchall()
    db.close()
"""

import sqlite3
import os
import csv
import json
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.environ.get(
    "CAT_SMARTENT_DB",
    os.path.join(os.path.dirname(__file__), "cat_smartent.db"),
)
CSV_PATH = os.path.join(BASE_DIR, "data", "equipment.csv")
EVENTS_PATH = os.path.join(BASE_DIR, "data", "events.json")


# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------
def get_db():
    """Return a new SQLite connection with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ---------------------------------------------------------------------------
# Schema creation
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
-- 1. Equipment master table
CREATE TABLE IF NOT EXISTS equipment (
    equipment_id    TEXT PRIMARY KEY,
    equipment_type  TEXT NOT NULL,
    site_id         TEXT,
    check_out_date  TEXT,
    check_in_date   TEXT,
    engine_hours_per_day REAL DEFAULT 0,
    idle_hours_per_day   REAL DEFAULT 0,
    operating_days  INTEGER DEFAULT 0,
    last_operator_id TEXT,
    status          TEXT DEFAULT 'AVAILABLE',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- 2. Operators
CREATE TABLE IF NOT EXISTS operators (
    operator_id TEXT PRIMARY KEY,
    name        TEXT,
    site_id     TEXT,
    status      TEXT DEFAULT 'ACTIVE',
    created_at  TEXT DEFAULT (datetime('now'))
);

-- 3. Rental records
CREATE TABLE IF NOT EXISTS rental_records (
    rental_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id        TEXT NOT NULL,
    checkout_date       TEXT,
    expected_return_date TEXT,
    actual_return_date  TEXT,
    operator_id         TEXT,
    site_id             TEXT,
    status              TEXT DEFAULT 'ACTIVE',
    created_at          TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
);

-- 4. Usage logs
CREATE TABLE IF NOT EXISTS usage_logs (
    log_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id  TEXT NOT NULL,
    operator_id   TEXT,
    site_id       TEXT,
    event_type    TEXT,
    engine_hours  REAL,
    idle_hours    REAL,
    timestamp     TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
);

-- 5. QR transactions
CREATE TABLE IF NOT EXISTS qr_transactions (
    transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id   TEXT NOT NULL,
    operator_id    TEXT,
    action         TEXT NOT NULL,
    site_id        TEXT,
    notes          TEXT,
    timestamp      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
);

-- 6. Anomalies
CREATE TABLE IF NOT EXISTS anomalies (
    anomaly_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id  TEXT NOT NULL,
    anomaly_type  TEXT,
    severity      TEXT,
    description   TEXT,
    detected_at   TEXT DEFAULT (datetime('now')),
    resolved      INTEGER DEFAULT 0,
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
);

-- 7. Demand forecasts
CREATE TABLE IF NOT EXISTS demand_forecasts (
    forecast_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_type   TEXT,
    site_id          TEXT,
    forecast_date    TEXT,
    predicted_demand REAL,
    created_at       TEXT DEFAULT (datetime('now'))
);

-- 8. Alerts
CREATE TABLE IF NOT EXISTS alerts (
    alert_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id TEXT,
    alert_type  TEXT,
    severity    TEXT,
    message     TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    is_read     INTEGER DEFAULT 0
);

-- 9. Users
CREATE TABLE IF NOT EXISTS users (
    user_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT DEFAULT 'operator',
    name       TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def init_db():
    """Create all tables if they don't exist, then seed if needed."""
    conn = get_db()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
        print("[DB] Schema initialized (9 tables).")

        # Seed only if equipment table is empty
        count = conn.execute("SELECT COUNT(*) FROM equipment").fetchone()[0]
        if count == 0:
            _seed_database(conn)
        else:
            print(f"[DB] Database already seeded ({count} equipment records).")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------
OPERATOR_NAMES = {
    "OP101": "James Wilson",
    "OP106": "Maria Garcia",
    "OP203": "Robert Chen",
    "OP301": "Sarah Johnson",
    "OP314": "David Kim",
    "OP400": "Emily Rodriguez",
    "OP500": "Michael Thompson",
}

DEMO_USERS = [
    ("admin", "admin123", "admin", "Admin User"),
    ("operator", "operator123", "operator", "Demo Operator"),
    ("manager", "manager123", "manager", "Demo Manager"),
]


def _seed_database(conn):
    """Import equipment.csv and events.json into SQLite. Called once."""
    now = datetime.now(timezone.utc).isoformat()

    # --- 1. Equipment from CSV ---
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r") as f:
            reader = csv.DictReader(f)
            eq_count = 0
            for row in reader:
                # Skip blank rows
                if not row.get("equipment_id", "").strip():
                    continue
                conn.execute(
                    """INSERT INTO equipment
                       (equipment_id, equipment_type, site_id,
                        check_out_date, check_in_date,
                        engine_hours_per_day, idle_hours_per_day,
                        operating_days, last_operator_id, status,
                        created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        row["equipment_id"].strip(),
                        row["equipment_type"].strip(),
                        row.get("site_id", "").strip() or None,
                        row.get("check_out_date", "").strip() or None,
                        row.get("check_in_date", "").strip() or None,
                        float(row.get("engine_hours_per_day", 0) or 0),
                        float(row.get("idle_hours_per_day", 0) or 0),
                        int(row.get("operating_days", 0) or 0),
                        row.get("last_operator_id", "").strip() or None,
                        "AVAILABLE",
                        now,
                        now,
                    ),
                )
                eq_count += 1
            print(f"[DB] Seeded {eq_count} equipment records from CSV.")
    else:
        print(f"[DB WARN] CSV not found: {CSV_PATH}")

    # --- 2. Operators ---
    op_ids = set()
    # Collect operator IDs from equipment
    rows = conn.execute(
        "SELECT DISTINCT last_operator_id FROM equipment WHERE last_operator_id IS NOT NULL"
    ).fetchall()
    for r in rows:
        op_ids.add(r[0])

    for op_id in op_ids:
        name = OPERATOR_NAMES.get(op_id, f"Operator {op_id}")
        conn.execute(
            "INSERT OR IGNORE INTO operators (operator_id, name, status, created_at) VALUES (?, ?, 'ACTIVE', ?)",
            (op_id, name, now),
        )
    # Also add the extra demo operators
    for op_id, name in OPERATOR_NAMES.items():
        conn.execute(
            "INSERT OR IGNORE INTO operators (operator_id, name, status, created_at) VALUES (?, ?, 'ACTIVE', ?)",
            (op_id, name, now),
        )
    print(f"[DB] Seeded {len(OPERATOR_NAMES)} operators.")

    # --- 3. Events from JSON → qr_transactions + usage_logs ---
    if os.path.exists(EVENTS_PATH):
        with open(EVENTS_PATH, "r") as f:
            events = json.load(f)
        evt_count = 0
        for evt in events:
            eid = evt.get("equipment_id", "")
            if not eid:
                continue
            action = "CHECK_OUT" if evt.get("event_type") == "checkout" else "CHECK_IN"
            conn.execute(
                """INSERT INTO qr_transactions
                   (equipment_id, operator_id, action, site_id, notes, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    eid,
                    evt.get("operator_id"),
                    action,
                    evt.get("site_id"),
                    evt.get("notes", ""),
                    evt.get("timestamp", now),
                ),
            )
            # Also create a usage_log entry
            conn.execute(
                """INSERT INTO usage_logs
                   (equipment_id, operator_id, site_id, event_type, timestamp)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    eid,
                    evt.get("operator_id"),
                    evt.get("site_id"),
                    evt.get("event_type", action),
                    evt.get("timestamp", now),
                ),
            )
            evt_count += 1
        print(f"[DB] Seeded {evt_count} QR transactions + usage logs from events.json.")
    else:
        print(f"[DB WARN] Events file not found: {EVENTS_PATH}")

    # --- 4. Rental records (derived from event pairs) ---
    if os.path.exists(EVENTS_PATH):
        with open(EVENTS_PATH, "r") as f:
            events = json.load(f)
        # Group by equipment_id, pair checkout→checkin
        from collections import defaultdict
        by_eq = defaultdict(list)
        for evt in events:
            if evt.get("equipment_id"):
                by_eq[evt["equipment_id"]].append(evt)

        rental_count = 0
        for eid, evts in by_eq.items():
            evts.sort(key=lambda e: e.get("timestamp", ""))
            pending_checkout = None
            for evt in evts:
                if evt.get("event_type") == "checkout":
                    pending_checkout = evt
                elif evt.get("event_type") == "checkin" and pending_checkout:
                    conn.execute(
                        """INSERT INTO rental_records
                           (equipment_id, checkout_date, actual_return_date,
                            operator_id, site_id, status, created_at)
                           VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)""",
                        (
                            eid,
                            pending_checkout.get("timestamp"),
                            evt.get("timestamp"),
                            pending_checkout.get("operator_id"),
                            pending_checkout.get("site_id"),
                            now,
                        ),
                    )
                    rental_count += 1
                    pending_checkout = None
        print(f"[DB] Seeded {rental_count} rental records.")

    # --- 5. Demo users ---
    for username, password, role, name in DEMO_USERS:
        conn.execute(
            "INSERT OR IGNORE INTO users (username, password, role, name, created_at) VALUES (?, ?, ?, ?, ?)",
            (username, password, role, name, now),
        )
    print(f"[DB] Seeded {len(DEMO_USERS)} demo users.")

    conn.commit()
    print("[DB] ✓ Database seeding complete.")
