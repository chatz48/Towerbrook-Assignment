from app.cli.batch_profile_completion import (
    missing_profile_fields,
    static_company_names,
    unique,
)


def test_missing_profile_fields_identifies_profile_gaps():
    assert missing_profile_fields(
        {
            "current_organization": "Canaccord Genuity",
            "headline": None,
            "linkedin_url": None,
            "website": None,
            "summary": "Sector banker.",
            "why_relevant": None,
            "metadata": {},
        }
    ) == ["official_profile", "outreach_signal", "source_evidence"]


def test_missing_profile_fields_accepts_complete_profile():
    assert missing_profile_fields(
        {
            "current_organization": "Canaccord Genuity",
            "linkedin_url": "https://example.com/profile",
            "summary": "Sector banker.",
            "why_relevant": "Advised on a relevant transaction.",
            "metadata": {"source_urls": ["https://example.com/profile"]},
        }
    ) == []


def test_static_company_names_maps_expert_company_links():
    assert static_company_names(
        {"companies": [{"companyId": "jsm-group"}, {"companyId": "missing"}]},
        {"jsm-group": {"name": "JSM Group"}},
    ) == ["JSM Group"]


def test_unique_dedupes_and_strips_values():
    assert unique([" A ", "A", None, "B"]) == ["A", "B"]
