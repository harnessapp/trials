@echo off
cd C:\trials

echo Running export_trials_json...
python C:\harness_scraper\harness_api\export_trials_json.py --input C:\Users\joel\FlutterProjects\harness_app\assets\upcoming_fields.csv --output C:\trials\data\trials.json

echo Adding changes...
git add .

echo Committing changes...
git commit -m "Update trials site: latest changes"

echo Pushing to GitHub...
git push origin main

echo Done!