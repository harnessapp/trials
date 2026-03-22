@echo off
cd C:\trials

echo Running export_trials_json...
python C:\harness_scraper\harness_api\export_trials_json.py --input C:\Users\joel\FlutterProjects\harness_app\assets\upcoming_fields.csv --output C:\trials\data\trials.json
if %errorlevel% neq 0 pause

echo Adding changes...
git add .

echo Committing changes...
git commit -m "Update trials site: latest changes"
if %errorlevel% neq 0 pause

echo Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 pause

echo Done!