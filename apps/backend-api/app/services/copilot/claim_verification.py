from __future__ import annotations

import re

from app.schemas.domain import Citation
from app.services.copilot.models import CopilotSynthesis

_STOPWORDS = frozenset(
    "the a an and or for with from that this their they them were was are is in on at to of by".split()
)


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9][a-z0-9'-]{2,}", text.lower())
        if token not in _STOPWORDS
    }


def claim_supported(claim: str, corpus: str, min_overlap: float = 0.22) -> bool:
    claim_tokens = _tokens(claim)
    if not claim_tokens:
        return True
    corpus_tokens = _tokens(corpus)
    if not corpus_tokens:
        return False
    overlap = len(claim_tokens & corpus_tokens) / len(claim_tokens)
    return overlap >= min_overlap


def verify_synthesis(
    synthesis: CopilotSynthesis,
    citations: list[Citation],
) -> tuple[CopilotSynthesis, list[str]]:
    corpus = " ".join((citation.evidence or citation.title or "") for citation in citations).lower()
    warnings: list[str] = []

    verified_findings: list[str] = []
    for finding in synthesis.key_findings:
        if claim_supported(finding, corpus):
            verified_findings.append(finding)
        else:
            warnings.append(f"Removed unverified finding: {finding}")

    verified_risks: list[str] = []
    for risk in synthesis.risks:
        if claim_supported(risk, corpus):
            verified_risks.append(risk)
        else:
            warnings.append(f"Removed unverified risk: {risk}")

    summary_ok = claim_supported(synthesis.answer_summary, corpus, min_overlap=0.12)
    if not summary_ok and corpus:
        warnings.append("Answer summary has limited citation overlap — treat as indicative.")

    if warnings and not synthesis.uncertainty_notes:
        uncertainty = "Some synthesis claims were filtered for weak citation support."
    elif warnings:
        uncertainty = f"{synthesis.uncertainty_notes} Filtered {len(warnings)} weak claim(s)."
    else:
        uncertainty = synthesis.uncertainty_notes

    return (
        CopilotSynthesis(
            answer_summary=synthesis.answer_summary,
            key_findings=verified_findings,
            gaps=synthesis.gaps,
            risks=verified_risks,
            follow_ups=synthesis.follow_ups,
            uncertainty_notes=uncertainty,
        ),
        warnings,
    )
