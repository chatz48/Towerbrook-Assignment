from app.services.deepseek_extractor import DeepSeekExtractor


def test_deepseek_extraction_normalizes_loose_model_json():
    extractor = DeepSeekExtractor()

    normalized = extractor._normalize_extraction_payload(
        {
            "people": [
                {
                    "person": "Jane Advisor",
                    "firm": "Canaccord Genuity",
                    "role": "M&A advisor",
                    "evidence": "Jane Advisor advised on the JSM transaction.",
                }
            ],
            "companies": ["JSM Group"],
            "relationships": [
                {
                    "from": "Canaccord Genuity",
                    "to": "JSM Group",
                    "role": "financial advisor",
                    "evidence": "Canaccord Genuity advised JSM Group.",
                }
            ],
            "facts": ["Canaccord Genuity was connected to the JSM transaction."],
            "citations": ["https://example.com/jsm"],
        },
        title="JSM transaction source",
        url="https://example.com/jsm",
        theme_id="grid-infrastructure",
    )

    assert normalized["people"][0]["name"] == "Jane Advisor"
    assert normalized["people"][0]["current_organization"] == "Canaccord Genuity"
    assert normalized["companies"][0]["name"] == "JSM Group"
    assert normalized["relationships"][0]["from_name"] == "Canaccord Genuity"
    assert normalized["relationships"][0]["to_name"] == "JSM Group"
    assert normalized["facts"][0]["fact_value"] == "Canaccord Genuity was connected to the JSM transaction."
    assert normalized["citations"][0]["url"] == "https://example.com/jsm"


def test_heuristic_extract_identifies_acquisition_target():
    extractor = DeepSeekExtractor()
    text = (
        "Badger Meter acquired SmartCover Systems from XPV Water Partners for $185m in 2025. "
        "Houlihan Lokey advised SmartCover Systems on the transaction."
    )
    result = extractor._heuristic_extract(text, title="SmartCover acquisition", url=None, theme_id="smart-water")
    company_names = [company.name for company in result.companies]
    assert "SmartCover Systems" in company_names
    target_facts = [fact for fact in result.facts if fact.fact_type == "target_company"]
    assert target_facts
    assert target_facts[0].fact_value == "SmartCover Systems"
