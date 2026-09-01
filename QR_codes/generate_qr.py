import qrcode

equipment_ids = [
     "EQ001",
    "EQ002",
    "EQ003",
    "EQ004",
    "EQ005",
    "EQ006",
    "EQ007"
]

for equipment_id in equipment_ids:
    img = qrcode.make(equipment_id)
    img.save(f"{equipment_id}.png")

print("QR codes created successfully.")