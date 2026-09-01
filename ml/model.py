
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

# Load equipment data
df = pd.read_csv("data/equipment.csv")

# Fill missing values
df["site_id"] = df["site_id"].fillna("UNKNOWN")

# Encode equipment type
encoder = LabelEncoder()
df["equipment_type_encoded"] = encoder.fit_transform(df["equipment_type"])

# Features
X = df[
    [
        "equipment_type_encoded",
        "engine_hours_per_day",
        "idle_hours_per_day",
        "operating_days"
    ]
]

# Target: utilization percentage
df["utilization"] = (
    df["engine_hours_per_day"]
    / (df["engine_hours_per_day"] + df["idle_hours_per_day"])
) * 100

y = df["utilization"]

# Train Random Forest model
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X, y)

print("===== ML MODEL TRAINED =====")
print("Model: Random Forest Regressor")
print("Training records:", len(df))

# Test prediction
sample = X.iloc[[0]]
prediction = model.predict(sample)[0]

print("Sample predicted utilization:", round(prediction, 2), "%")

# Save trained model
joblib.dump(model, "ml/equipment_model.pkl")
print("Model saved successfully!")
