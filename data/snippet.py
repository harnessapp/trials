import json
from datetime import datetime

with open("trials.json") as f:
    data = json.load(f)

today = datetime.now().strftime("%Y-%m-%d")

for entry in data.get("meetings", []):
    if entry.get("Date") == today:
        print(entry.get("Horse"), entry.get("Horse Qty"))