import os


os.environ["TOWERBROOK_TESTING"] = "1"
for key in (
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "BACKEND_API_TOKEN",
    "CRON_SECRET",
    "DEEPSEEK_API_KEY",
    "KEIROLABS_API_KEY",
):
    os.environ.pop(key, None)
