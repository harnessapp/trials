import os
import subprocess
from datetime import datetime

# 1) Current upcoming_fields.csv used by the app
CSV_PATH = r"C:\Users\joel\FlutterProjects\harness_app\assets\upcoming_fields.csv"

# 2) Exporter script that builds trials.json
EXPORTER_PATH = r"C:\harness_scraper\harness_api\export_trials_json.py"

# 3) Local clone of your GitHub Pages repo
SITE_REPO = r"C:\trials"

# 4) Output file inside the site repo
EXPORT_OUTPUT = os.path.join(SITE_REPO, "data", "trials.json")


def run(cmd, cwd=None):
    print(f"\n> {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")


def main():
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    if not os.path.exists(EXPORTER_PATH):
        raise FileNotFoundError(f"Exporter not found: {EXPORTER_PATH}")

    if not os.path.exists(SITE_REPO):
        raise FileNotFoundError(f"Site repo not found: {SITE_REPO}")

    os.makedirs(os.path.join(SITE_REPO, "data"), exist_ok=True)

    # Build latest trials.json directly into the site repo
    run([
        "python",
        EXPORTER_PATH,
        "--input",
        CSV_PATH,
        "--output",
        EXPORT_OUTPUT,
    ])

    # Stage only the site data file
    run(["git", "add", "data/trials.json"], cwd=SITE_REPO)

    # Check whether anything actually changed
    diff_check = subprocess.run(
        ["git", "diff", "--cached", "--quiet"],
        cwd=SITE_REPO
    )

    if diff_check.returncode == 0:
        print("\nNo changes to commit.")
        return

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    run(
        ["git", "commit", "-m", f"Update trials data {timestamp}"],
        cwd=SITE_REPO
    )
    run(["git", "push", "origin", "main"], cwd=SITE_REPO)

    print("\nTrials site updated successfully.")


if __name__ == "__main__":
    main()