from functools import lru_cache
from os import environ, getenv
from pathlib import Path


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            environ.setdefault(key, value)


def _load_env_files() -> None:
    if getenv("TOWERBROOK_TESTING") == "1":
        return
    api_root = Path(__file__).resolve().parents[1]
    repo_root = Path(__file__).resolve().parents[3]
    _load_env_file(repo_root / ".env")
    _load_env_file(api_root / ".env")


_load_env_files()


def _deepseek_model() -> str:
    model = getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
    aliases = {
        "deepseek-chat": "deepseek-v4-flash",
        "deepseek-v4": "deepseek-v4-flash",
    }
    return aliases.get(model, model)


class Settings:
    supabase_url: str | None = getenv("SUPABASE_URL")
    supabase_service_role_key: str | None = getenv("SUPABASE_SERVICE_ROLE_KEY")
    backend_api_token: str | None = getenv("BACKEND_API_TOKEN")
    cron_secret: str | None = getenv("CRON_SECRET")
    deepseek_api_key: str | None = getenv("DEEPSEEK_API_KEY")
    deepseek_model: str = _deepseek_model()
    tavily_api_key: str | None = getenv("TAVILY_API_KEY")
    serper_api_key: str | None = getenv("SERPER_API_KEY")
    brave_search_api_key: str | None = getenv("BRAVE_SEARCH_API_KEY")
    keirolabs_api_key: str | None = getenv("KEIROLABS_API_KEY")
    keirolabs_base_url: str = getenv("KEIROLABS_BASE_URL", "https://kierolabs.space")
    keirolabs_search_results: int = int(getenv("KEIROLABS_SEARCH_RESULTS", "5"))
    keirolabs_fetches_per_query: int = int(getenv("KEIROLABS_FETCHES_PER_QUERY", "1"))
    keirolabs_max_requests_per_job: int = int(getenv("KEIROLABS_MAX_REQUESTS_PER_JOB", "12"))
    bge_model: str = getenv("BGE_MODEL", "BAAI/bge-small-en-v1.5")
    bge_vector_dimensions: int = int(getenv("BGE_VECTOR_DIMENSIONS", "384"))
    cors_allowed_origins: str | None = getenv("CORS_ALLOWED_ORIGINS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
