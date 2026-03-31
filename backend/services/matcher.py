"""
Job Matching Engine
Computes a match score (0-100) between a user's resume and a job description.
Method: TF-IDF cosine similarity + keyword overlap bonus.
"""
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _clean_text(text: str) -> str:
    """Lowercase, remove punctuation/numbers, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def compute_match(
    resume_text: str,
    resume_keywords: list[str],
    resume_skills: list[str],
    job_title: str,
    job_description: str,
    user_job_roles: list[str],
) -> dict:
    """
    Returns:
      {
        "score": float (0-100),
        "matched_keywords": list[str],
        "breakdown": { "tfidf": float, "keyword_overlap": float, "title_bonus": float }
      }
    """
    if not job_description or not resume_text:
        return {"score": 0.0, "matched_keywords": [], "breakdown": {}}

    resume_clean = _clean_text(resume_text + " " + " ".join(resume_skills))
    job_clean = _clean_text(job_title + " " + job_description)

    # ── 1. TF-IDF cosine similarity (60% weight) ──────────────────────────────
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=5000,
        stop_words="english",
    )
    try:
        tfidf_matrix = vectorizer.fit_transform([resume_clean, job_clean])
        tfidf_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
    except Exception:
        tfidf_score = 0.0

    # ── 2. Keyword overlap (30% weight) ───────────────────────────────────────
    job_tokens = set(job_clean.split())
    resume_tokens = set(resume_clean.split())
    all_resume_kw = set(kw.lower() for kw in (resume_keywords + resume_skills))

    matched_kw = []
    for kw in all_resume_kw:
        kw_clean = _clean_text(kw)
        if kw_clean and kw_clean in job_clean:
            matched_kw.append(kw)

    keyword_overlap = len(matched_kw) / max(len(all_resume_kw), 1)

    # ── 3. Job title / role bonus (10% weight) ────────────────────────────────
    title_bonus = 0.0
    if user_job_roles:
        job_title_lower = job_title.lower()
        for role in user_job_roles:
            role_words = role.lower().split()
            if all(word in job_title_lower for word in role_words):
                title_bonus = 1.0
                break
            # Partial match
            if any(word in job_title_lower for word in role_words):
                title_bonus = max(title_bonus, 0.5)

    # ── Final weighted score ───────────────────────────────────────────────────
    score = (tfidf_score * 0.60 + keyword_overlap * 0.30 + title_bonus * 0.10) * 100
    score = round(min(score, 100.0), 1)

    return {
        "score": score,
        "matched_keywords": sorted(set(matched_kw))[:30],  # top 30
        "breakdown": {
            "tfidf": round(tfidf_score * 100, 1),
            "keyword_overlap": round(keyword_overlap * 100, 1),
            "title_bonus": round(title_bonus * 100, 1),
        },
    }


def batch_match(
    resume: dict,
    jobs: list[dict],
    user_job_roles: list[str],
    threshold: int = 70,
) -> list[dict]:
    """
    Match a resume against a list of jobs.
    Returns only jobs above the threshold, sorted by score desc.
    """
    results = []
    for job in jobs:
        result = compute_match(
            resume_text=resume.get("parsed_text", ""),
            resume_keywords=resume.get("keywords", []),
            resume_skills=resume.get("parsed_skills", []),
            job_title=job.get("title", ""),
            job_description=job.get("description", ""),
            user_job_roles=user_job_roles,
        )
        if result["score"] >= threshold:
            results.append({
                "job_id": job["id"],
                "match_score": result["score"],
                "matched_keywords": result["matched_keywords"],
            })
    return sorted(results, key=lambda x: x["match_score"], reverse=True)
