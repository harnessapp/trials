import json
from datetime import datetime
from collections import defaultdict
import requests

# ----------------------------
# CONFIG
# ----------------------------
TRIALS_FILE = "trials.json"
TODAY_STR = datetime.today().strftime("%Y-%m-%d")  # YYYY-MM-DD
TRIALS_URL = "https://harnessapp.github.io/trials/"
BITLY_TOKEN = "YOUR_BITLY_GENERIC_TOKEN"  # <-- replace with your Bitly token
# ----------------------------

def shorten_url(long_url):
    """Shorten a URL using Bitly"""
    headers = {"Authorization": f"Bearer {BITLY_TOKEN}"}
    json_data = {"long_url": long_url}
    try:
        resp = requests.post(
            "https://api-ssl.bitly.com/v4/shorten",
            json=json_data,
            headers=headers,
            timeout=5
        )
        if resp.status_code == 200:
            return resp.json()["link"]
    except:
        pass
    return long_url  # fallback if shortening fails

def get_first_available_url(runner):
    """Return the first T1/T2/T3 Vision URL that exists and is not '_NoVision', shortened"""
    for t in ["T1", "T2", "T3"]:
        url = runner.get(f"{t} Vision")
        if url and url != "_NoVision":
            return shorten_url(url)
    return None

def parse_race_time(tstr):
    try:
        return datetime.strptime(tstr.strip(), "%I:%M %p")
    except:
        return datetime.strptime("23:59", "%H:%M")  # fallback

def clean_time(tstr):
    return tstr.replace(" PM", "").replace(" AM", "").strip()

# Load JSON
with open(TRIALS_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

first_starters = defaultdict(list)
trialed_counts = {}

# Iterate over meetings
for meeting in data.get("meetings", []):
    if meeting.get("date") != TODAY_STR:
        continue

    venue = meeting.get("venue", "")[:4].upper()

    for race in meeting.get("races", []):
        race_no = race.get("raceNo", "?")
        race_time_str = race.get("time", "23:59 PM")
        race_time_obj = parse_race_time(race_time_str)
        race_time_clean = clean_time(race_time_str)

        race_key = (race_time_obj, race_time_clean, venue, race_no)

        for runner in race.get("runners", []):
            horse = runner.get("Horse", "Unknown")
            horse_no = runner.get("Horse No", "").split(".")[0]

            # First starters
            try:
                horse_qty = int(float(runner.get("Horse Qty", 1)))
            except:
                horse_qty = 1

            if horse_qty == 0:
                vision_url = get_first_available_url(runner)
                vision_icon = " 🎥" if vision_url else ""

                entry = f"{horse_no} {horse}{vision_icon}"
                if vision_url:
                    entry += f" {vision_url}"

                first_starters[race_key].append(entry)

            # Trialed summary
            for t in ["T1", "T2", "T3"]:
                since_lr = runner.get(f"{t} SinceLR")
                try:
                    if float(since_lr) > 0:
                        trialed_counts[venue] = trialed_counts.get(venue, 0) + 1
                        break
                except:
                    continue

# Sort races by race time
sorted_races = sorted(first_starters.keys(), key=lambda x: x[0])

# Build tweet
tweet_lines = ["Today's first starters 👀"]

for race_time_obj, race_time_clean, venue, race_no in sorted_races:
    tweet_lines.append(f"\n{race_time_clean} {venue} R{race_no}")
    for runner in first_starters[(race_time_obj, race_time_clean, venue, race_no)]:
        tweet_lines.append(f"• {runner}")

# Trialed summary line
if trialed_counts:
    tweet_lines.append("\nTrialed since race:")
    for v, c in trialed_counts.items():
        tweet_lines.append(f"{v} ({c})")

# Footer
tweet_lines.append(f"\nTrotify ► {TRIALS_URL}")

tweet_text = "\n".join(tweet_lines)

# Output to console for manual posting
print(tweet_text)