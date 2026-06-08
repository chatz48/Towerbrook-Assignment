from __future__ import annotations

THEME_QUERY_PROFILES: dict[str, dict[str, str]] = {
    "clean-energy-advisory": {
        "towerbrook_focus": '("renewable" OR wind OR "energy transition")',
        "sector_platform": '("renewable energy services" OR "energy transition platform")',
        "sector_portfolio": "(renewable OR wind OR solar)",
        "sector_deal": '("clean energy" OR renewable)',
        "sector_people": '("clean energy" OR renewable)',
    },
    "grid-infrastructure": {
        "towerbrook_focus": '("grid connection" OR "high voltage" OR infrastructure)',
        "sector_platform": '("grid services" OR "power infrastructure")',
        "sector_portfolio": '("grid infrastructure" OR electrical OR transmission)',
        "sector_deal": '("grid services" OR "power solutions")',
        "sector_people": '("grid services" OR "power infrastructure")',
    },
    "smart-water": {
        "towerbrook_focus": '(water OR "infrastructure services")',
        "sector_platform": '("water infrastructure" OR "water technology")',
        "sector_portfolio": "(water OR wastewater)",
        "sector_deal": "(water OR wastewater)",
        "sector_people": '("water infrastructure" OR "water technology")',
    },
}


def theme_discovery_queries(theme_id: str) -> list[str]:
    profile = THEME_QUERY_PROFILES[theme_id]
    sector = profile["sector_people"]
    return [
        f'site:towerbrook.com ("investment" OR "partnership") {profile["towerbrook_focus"]}',
        f'("private equity" OR "infrastructure fund") {profile["sector_platform"]} (acquisition OR investment)',
        f'("portfolio company" OR "sponsor-backed") {profile["sector_portfolio"]} ("add-on acquisition" OR sale)',
        f'("secondary buyout" OR "majority investment") {profile["sector_deal"]} (partner OR managing director)',
        f'{sector} (founder OR CEO OR chair) ("private equity" OR "portfolio company")',
        f'{sector} ("financial advisor" OR "legal counsel" OR "commercial due diligence") (partner OR managing director)',
    ]


THEME_QUERIES = {theme_id: theme_discovery_queries(theme_id) for theme_id in THEME_QUERY_PROFILES}
