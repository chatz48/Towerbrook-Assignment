"""Import renewable energy leaders CSV into Supabase graph tables."""
import csv
import hashlib
import os
import re
import sys
from pathlib import Path

# Add the project to path so we can use app packages
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings, get_settings
from supabase import create_client

settings = get_settings()
if not settings.supabase_url or not settings.supabase_service_role_key:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

SEEDED_BY = "import-renewable-energy-leaders"
THEME_ID = "clean-energy-advisory"
MODEL = "BAAI/bge-small-en-v1.5"

EXPERT_TYPES = {
    "ex-founder": re.compile(r"\bfounder\b"),
    "operator": re.compile(r"\b(ceo|chief executive|director|managing director|executive director|president)\b", re.I),
    "consultant": re.compile(r"\bconsultant\b", re.I),
    "advisor": re.compile(r"\badvisor\b", re.I),
    "investor": re.compile(r"\b(investor|partner)\b", re.I),
}

SPECIALTY_PATTERNS = [
    (r"\b(solar|solar pv|solar energy|solar power)\b", "Solar Energy"),
    (r"\b(wind|wind energy|wind power)\b", "Wind Energy"),
    (r"\b(green hydrogen|hydrogen)\b", "Green Hydrogen"),
    (r"\b(energy storage|bess|battery storage)\b", "Energy Storage"),
    (r"\b(renewable energy|clean energy|energy transition)\b", "Renewable Energy"),
    (r"\b(electric vehicle|ev |ev charging)\b", "Electric Vehicles"),
    (r"\b(sustainability|sustainable)\b", "Sustainability"),
    (r"\b(private equity|venture capital|investment)\b", "Investment"),
    (r"\b(grid|transmission|distribution|infrastructure)\b", "Grid Infrastructure"),
    (r"\b(project management|project development)\b", "Project Management"),
    (r"\b(recruitment|talent|executive search|headhunt)\b", "Recruitment"),
    (r"\b(data centre|data center|digital infrastructure)\b", "Digital Infrastructure"),
    (r"\b(lithium|battery manufacturing|battery)\b", "Battery Technology"),
    (r"\b(epc|engineering procurement)\b", "EPC"),
    (r"\b(aerodynamics|cfd|wind tunnel)\b", "Aerodynamics"),
    (r"\b(logistics|supply chain|freight)\b", "Logistics"),
    (r"\b(semiconductor|chip)\b", "Semiconductors"),
    (r"\b(training|leadership development)\b", "Training & Development"),
    (r"\b(legal|law)\b", "Legal"),
    (r"\b(ai |artificial intelligence|machine learning)\b", "AI & ML"),
]

RELATIONSHIP_PATTERNS = [
    (re.compile(r"\bfounder\b", re.I), "founder"),
    (re.compile(r"\b(co[- ]?founder)\b", re.I), "co_founder"),
    (re.compile(r"\b(ceo|chief executive)\b", re.I), "ceo"),
    (re.compile(r"\b(managing director|executive director)\b", re.I), "managing_director"),
    (re.compile(r"\bdirector\b", re.I), "director"),
    (re.compile(r"\bconsultant\b", re.I), "consultant"),
    (re.compile(r"\badvisor\b", re.I), "advisor"),
    (re.compile(r"\b(managing )?partner\b", re.I), "partner"),
    (re.compile(r"\b(chairperson|chair)\b", re.I), "chairperson"),
    (re.compile(r"\b(cto|chief technology)\b", re.I), "cto"),
    (re.compile(r"\b(president)\b", re.I), "president"),
]


def parse_csv_file(filepath):
    rows = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def infer_expert_type(title, headline="", summary=""):
    text = f"{title} {headline}".lower()
    if re.search(r"\bfounder\b", text) and re.search(r"\b(co[- ]?founder|ceo|chief|md|managing director)\b", text):
        return "ex-founder"
    if re.search(r"\bfounder\b", text):
        return "ex-founder"
    if re.search(r"\bceo\b|\bchief executive\b", text):
        return "operator"
    if re.search(r"\bdirector\b|\bmanaging director\b|\bexecutive director\b", text):
        return "operator"
    if re.search(r"\bconsultant\b|\bconsulting\b", text):
        return "consultant"
    if re.search(r"\badvisor\b|\badvisory\b", text):
        return "advisor"
    if re.search(r"\binvestor\b|\bpartner\b", text):
        return "investor"
    return "operator"


def infer_relationship_type(title):
    for pattern, rel_type in RELATIONSHIP_PATTERNS:
        if pattern.search(title):
            return rel_type
    return "employee"


def extract_specialties(summary, headline, enriched):
    text = f"{summary} {headline} {enriched}".lower()
    specialties = []
    for pattern, label in SPECIALTY_PATTERNS:
        if re.search(re.compile(pattern, re.I), text):
            if label not in specialties:
                specialties.append(label)
    return specialties if specialties else ["Renewable Energy"]


def score_person(expert_type, connections):
    base = {"ex-founder": 85, "operator": 78, "investor": 72, "advisor": 70, "consultant": 68}[expert_type]
    conn = int(connections) if connections else 0
    bonus = min(20, conn // 2000)
    return min(100, base + bonus)


def score_momentum(connections, jobs_count, funding):
    score = 50
    conn = int(connections) if connections else 0
    if conn > 10000:
        score += 20
    elif conn > 5000:
        score += 12
    jobs = int(jobs_count) if jobs_count else 0
    if jobs > 10:
        score += 15
    elif jobs > 5:
        score += 8
    fund = int(funding) if funding else 0
    if fund > 50000000:
        score += 15
    elif fund > 1000000:
        score += 8
    return min(100, score)


def embed(text):
    vector = [0.0] * 384
    tokens = str(text or "empty").lower().split()
    for token in tokens if tokens else ["empty"]:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % 384
        vector[idx] += 1 if (digest[4] % 2) else -1
    norm = sum(v * v for v in vector) ** 0.5 or 1
    return [round(v / norm, 8) for v in vector]


def hash_text(text):
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()


def upsert_entity_embedding(entity_type, entity_id, profile_text):
    existing = supabase.table("entity_embeddings").select("id").eq(
        "entity_type", entity_type
    ).eq("entity_id", entity_id).eq("embedding_model", MODEL).limit(1).execute()
    if existing.data:
        return
    supabase.table("entity_embeddings").insert({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "profile_text": profile_text,
        "embedding": embed(profile_text),
        "embedding_model": MODEL,
        "profile_hash": hash_text(profile_text),
        "metadata": {"seeded_by": SEEDED_BY},
    }).execute()


def process_rows(rows):
    company_count = 0
    person_count = 0
    relationship_count = 0
    job_count = 0
    company_domain_map = {}

    for i, row in enumerate(rows):
        company_name = (row.get("Company Name") or "").strip()
        domain = (row.get("Company Domain") or row.get("Domain") or "").strip()
        first_name = (row.get("First Name") or "").strip()
        last_name = (row.get("Last Name") or "").strip()
        full_name = (row.get("Full Name") or f"{first_name} {last_name}").strip()
        job_title = (row.get("Job Title") or "").strip()
        location = (row.get("Location") or "").strip()
        linkedin_url = (row.get("LinkedIn Profile") or "").strip()
        headline = (row.get("Headline") or "").strip()
        summary = (row.get("Summary") or "").strip()
        work_email = (row.get("Work Email") or row.get("Work Email (2)") or "").strip()
        latest_funding = (row.get("Latest Funding") or "").strip()
        connections = (row.get("Connections") or "").strip()
        jobs_count = (row.get("Jobs Count") or "").strip()
        enriched_summary = (row.get("Summarize LinkedIn profile") or "").strip()

        if not full_name and not company_name:
            continue

        company_ext_id = domain or slugify(company_name)
        person_ext_id = None
        if linkedin_url:
            match = re.search(r"/in/([^/]+)", linkedin_url)
            person_ext_id = f"linkedin:{match.group(1).rstrip('/')}" if match else f"csv:{slugify(full_name)}"
        else:
            person_ext_id = f"csv:{slugify(full_name)}"

        # Upsert company
        if company_name and company_ext_id not in company_domain_map:
            existing = supabase.table("companies").select("id, theme_ids, description, metadata").or_(
                f"external_id.eq.{company_ext_id},website.eq.{domain}"
            ).limit(1).execute()

            if existing.data:
                c = existing.data[0]
                updated = supabase.table("companies").update({
                    "website": domain or c.get("website"),
                    "theme_ids": list(set((c.get("theme_ids") or []) + [THEME_ID])),
                    "description": c.get("description") or (summary[:500] if summary else None),
                    "metadata": {
                        **(c.get("metadata") or {}),
                        "seeded_by": SEEDED_BY,
                        "funding": latest_funding or (c.get("metadata") or {}).get("funding"),
                        "csv_source": True,
                    },
                    "updated_at": "now()",
                }).eq("id", c["id"]).execute()
                company_id = c["id"]
            else:
                result = supabase.table("companies").upsert({
                    "external_id": company_ext_id,
                    "name": company_name,
                    "category": "target",
                    "theme_ids": [THEME_ID],
                    "website": domain or None,
                    "description": summary[:500] if summary else None,
                    "relevance_score": 70,
                    "momentum_score": 65,
                    "confidence": 0.75,
                    "metadata": {
                        "seeded_by": SEEDED_BY,
                        "funding": latest_funding or None,
                        "csv_source": True,
                    },
                }, on_conflict="external_id").execute()
                company_id = result.data[0]["id"] if result.data else None

            if company_id:
                company_domain_map[company_ext_id] = company_id
                company_count += 1
                profile = " ".join(filter(None, [company_name, "renewable energy", domain, (summary or "")[:300]]))
                upsert_entity_embedding("company", company_id, profile)

        if not full_name:
            continue

        expert_type = infer_expert_type(job_title, headline, summary)
        specialties = extract_specialties(summary, headline, enriched_summary)

        person_result = supabase.table("people").upsert({
            "external_id": person_ext_id,
            "name": full_name,
            "headline": headline or job_title or None,
            "current_organization": company_name or None,
            "location": location or None,
            "expert_type": expert_type,
            "theme_ids": [THEME_ID],
            "specialties": specialties,
            "linkedin_url": linkedin_url or None,
            "website": f"https://{domain}" if domain else None,
            "summary": summary or None,
            "why_relevant": enriched_summary or (summary[:300] if summary else None),
            "relevance_score": score_person(expert_type, connections),
            "momentum_score": score_momentum(connections, jobs_count, latest_funding),
            "confidence": 0.8,
            "metadata": {
                "seeded_by": SEEDED_BY,
                "connections": int(connections) if connections else None,
                "jobs_count": int(jobs_count) if jobs_count else None,
                "work_email": work_email or None,
                "funding": latest_funding or None,
                "csv_source": True,
            },
        }, on_conflict="external_id").execute()

        if not person_result.data:
            print(f"  ERROR upserting {full_name}: no data returned")
            continue

        person_row = person_result.data[0]
        person_count += 1

        profile = " ".join(filter(None, [
            full_name, job_title, headline, company_name, location,
            enriched_summary, *specialties,
        ]))
        upsert_entity_embedding("person", person_row["id"], profile)

        company_id = company_domain_map.get(company_ext_id)
        if company_id:
            rel_check = supabase.table("relationships").select("id").eq(
                "from_entity_type", "person"
            ).eq("from_entity_id", person_row["id"]).eq(
                "to_entity_type", "company"
            ).eq("to_entity_id", company_id).limit(1).execute()

            if not rel_check.data:
                supabase.table("relationships").insert({
                    "from_entity_type": "person",
                    "from_entity_id": person_row["id"],
                    "to_entity_type": "company",
                    "to_entity_id": company_id,
                    "theme_id": THEME_ID,
                    "relationship_type": infer_relationship_type(job_title),
                    "evidence_text": f"{full_name} is {job_title} at {company_name}",
                    "confidence": 0.85,
                    "metadata": {
                        "seeded_by": SEEDED_BY,
                        "job_title": job_title,
                    },
                }).execute()
                relationship_count += 1

        has_missing = not work_email or not summary or not company_name or not domain
        if has_missing:
            supabase.table("research_jobs").insert({
                "job_type": "expert_profile_completion",
                "status": "queued",
                "theme_id": THEME_ID,
                "target_type": "person",
                "target_id": person_row["id"],
                "priority": 70,
                "metadata": {
                    "target_name": full_name,
                    "target_organizations": [company_name] if company_name else [],
                    "target_companies": [company_name] if company_name else [],
                    "reason": [
                        "missing_email" if not work_email else "",
                        "missing_summary" if not summary else "",
                        "missing_company" if not company_name else "",
                        "missing_domain" if not domain else "",
                    ],
                    "category": "expert-profile-completion",
                    "max_rounds": 2,
                    "max_queries": 6,
                    "results_per_query": 3,
                },
            }).execute()
            job_count += 1

        if (i + 1) % 10 == 0:
            print(f"  Processed {i + 1}/{len(rows)}...")

    return company_count, person_count, relationship_count, job_count


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_renewable_csv.py <path-to-csv>")
        sys.exit(1)

    csv_path = sys.argv[1]
    print(f"Reading {csv_path}...")
    rows = parse_csv_file(csv_path)
    print(f"Parsed {len(rows)} rows")

    print("Importing into Supabase...")
    company_count, person_count, relationship_count, job_count = process_rows(rows)

    print(f"\nDone! Imported:")
    print(f"  {company_count} companies")
    print(f"  {person_count} people")
    print(f"  {relationship_count} relationships")
    print(f"  {job_count} enrichment jobs created")


if __name__ == "__main__":
    main()
