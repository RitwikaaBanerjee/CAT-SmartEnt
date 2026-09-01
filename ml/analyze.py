import pandas as pd

# Load equipment data
df = pd.read_csv("data/equipment.csv")

print("\n===== RAW DATA =====")
print(df)

# Calculate utilization percentage
df["utilization"] = (
    df["engine_hours_per_day"]
    / (df["engine_hours_per_day"] + df["idle_hours_per_day"])
    * 100
)

df["utilization"] = df["utilization"].round(2)


# Classify utilization
def classify_utilization(utilization):
    if utilization < 30:
        return "Under-utilized"
    elif utilization < 80:
        return "Moderately Utilized"
    else:
        return "Highly Utilized"


df["utilization_status"] = df["utilization"].apply(
    classify_utilization
)


# Check missing location
df["location_status"] = df["site_id"].apply(
    lambda x: "Location Missing"
    if pd.isna(x)
    else "Location Available"
)


print("\n===== EQUIPMENT ANALYSIS =====")

print(
    df[
        [
            "equipment_id",
            "equipment_type",
            "site_id",
            "utilization",
            "utilization_status",
            "location_status"
        ]
    ].to_string(index=False)
)

