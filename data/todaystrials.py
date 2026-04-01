import json
from datetime import datetime

# ----------------------------
# CONFIG
# ----------------------------
TRIALS_FILE = "trials.json"
TODAY_STR = datetime.today().strftime("%Y-%m-%d")
MAX_TWEET_LEN = 280

# Abbreviate venue names
VENUE_ABBR = {
    "Bathurst": "Bth",
    "Bendigo": "Bdgo",
    "Redcliffe": "Rdcl"
}
# ----------------------------

def get_vision_url(runner):
    for t in ["T1", "T2", "T3"]:
        url = runner.get(f"{t} Vision")
        if url and url != "_NoVision":
            return url
    return None

# Load JSON
with open(TRIALS_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

first_starters = []
trialed_since_lr = []

for meeting in data.get("meetings", []):
    if meeting.get("date") != TODAY_STR:
        continue

    venue = VENUE_ABBR.get(meeting.get("venue", ""), meeting.get("venue", ""))
    
    for race in meeting.get("races", []):
        race_no = race.get("raceNo", "?")

        for runner in race.get("runners", []):
            horse = runner.get("Horse", "Unknown")
            horse_no = runner.get("Horse No", "").split(".")[0]

            # First starters
            try:
                horse_qty = int(float(runner.get("Horse Qty", 1)))
            except:
                horse_qty = 1

            if horse_qty == 0:
                vision = get_vision_url(runner)
                entry = f"{venue} {race_no}-{horse_no} {horse}"
                if vision:
                    entry += f" ({vision})"
                first_starters.append(entry)

            # Trialed since last run (SinceLR > 0)
            for t in ["T1", "T2", "T3"]:
                since_lr = runner.get(f"{t} SinceLR")
                try:
                    if float(since_lr) > 0:
                        entry = f"{venue} {race_no}-{horse_no} {horse}"
                        trialed_since_lr.append(entry)
                        break
                except:
                    continue

# Build tweet
tweet_lines = ["Today 👀"]
tweet_lines.append("First starters:" + ("" if first_starters else " None"))

# Add first starters until near tweet length limit
for fs in first_starters:
    if len("\n".join(tweet_lines) + "\n" + fs) > MAX_TWEET_LEN:
        tweet_lines.append("…")  # indicate truncated
        break
    tweet_lines.append(fs)

tweet_lines.append("\nTrialed since last run:" + ("" if trialed_since_lr else " None"))

# Add trialed horses until near tweet length limit
for tr in trialed_since_lr:
    if len("\n".join(tweet_lines) + "\n" + tr) > MAX_TWEET_LEN:
        tweet_lines.append("…")  # indicate truncated
        break
    tweet_lines.append(tr)

tweet_text = "\n".join(tweet_lines)

print(tweet_text)