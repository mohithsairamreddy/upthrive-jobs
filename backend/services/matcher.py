"""
Job Matching Engine — Pure Python TF-IDF
No numpy, no scikit-learn. Works on any Python version.
Computes match score (0-100) between resume and job description.
"""
import re
import math
from collections import Counter


def _tokenize(text: str) -> list[str]:
    """Lowercase, remove punctuation, split into tokens. Keep bigrams too."""
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    words = [w for w in text.split() if len(w) > 2 and w not in _STOPWORDS]

    # Add bigrams for phrases like "machine learning", "software engineer"
    bigrams = [f"{words[i]}_{words[i+1]}" for i in range(len(words) - 1)]
    return words + bigrams


_STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "are", "was", "were",
    "has", "have", "had", "will", "would", "can", "could", "should",
    "may", "might", "shall", "been", "being", "but", "not", "from",
    "you", "your", "our", "their", "its", "all", "any", "each", "more",
    "also", "about", "into", "over", "after", "such", "both", "through",
    "during", "including", "without", "use", "used", "using", "work",
    "working", "team", "ability", "strong", "good", "new", "etc",
    "experience", "knowledge", "skills", "skill", "years", "year",
    "must", "required", "requirements", "responsibilities", "role",
    "position", "job", "company", "candidate", "looking", "join",
    "help", "build", "develop", "design", "implement", "ensure",
    "provide", "manage", "support", "create", "maintain", "make",
}


def _tfidf_vectors(doc1_tokens: list[str], doc2_tokens: list[str]) -> tuple[dict, dict]:
    """Compute TF-IDF vectors for two documents."""
    tf1 = Counter(doc1_tokens)
    tf2 = Counter(doc2_tokens)
    vocab = set(tf1) | set(tf2)

    vec1, vec2 = {}, {}
    for term in vocab:
        # TF: term count / total tokens
        t1 = tf1.get(term, 0) / max(len(doc1_tokens), 1)
        t2 = tf2.get(term, 0) / max(len(doc2_tokens), 1)
        # IDF: log((2+1) / (docs_containing_term + 1)) + 1
        df = (1 if tf1.get(term, 0) > 0 else 0) + (1 if tf2.get(term, 0) > 0 else 0)
        idf = math.log(3 / (df + 1)) + 1
        vec1[term] = t1 * idf
        vec2[term] = t2 * idf

    return vec1, vec2


def _cosine_similarity(vec1: dict, vec2: dict) -> float:
    """Cosine similarity between two TF-IDF vectors."""
    dot = sum(vec1.get(t, 0) * vec2.get(t, 0) for t in vec2)
    mag1 = math.sqrt(sum(v * v for v in vec1.values()))
    mag2 = math.sqrt(sum(v * v for v in vec2.values()))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


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

    # Build combined text strings
    resume_combined = resume_text + " " + " ".join(resume_skills)
    job_combined = job_title + " " + job_description

    # ── 1. TF-IDF cosine similarity (60% weight) ──────────────────────────────
    resume_tokens = _tokenize(resume_combined)
    job_tokens    = _tokenize(job_combined)

    vec1, vec2 = _tfidf_vectors(resume_tokens, job_tokens)
    tfidf_score = _cosine_similarity(vec1, vec2)

    # ── 2. Keyword overlap (50% weight) ───────────────────────────────────────
    all_resume_kw = set(kw.lower() for kw in (resume_keywords + resume_skills))
    job_text_lower = job_combined.lower()

    matched_kw = []
    for kw in all_resume_kw:
        kw_clean = re.sub(r"[^a-z\s]", " ", kw).strip()
        if kw_clean and kw_clean in job_text_lower:
            matched_kw.append(kw)

    # Jaccard-style: matched / union — fairer than dividing only by resume size
    job_tokens_set = set(_tokenize(job_combined))
    union_size = len(all_resume_kw | job_tokens_set)
    keyword_overlap = len(matched_kw) / max(union_size, 1) * 3  # scale up (Jaccard is normally small)
    keyword_overlap = min(keyword_overlap, 1.0)

    # ── 3. Job title / role bonus (10% weight) ────────────────────────────────
    title_bonus = 0.0
    if user_job_roles:
        job_title_lower = job_title.lower()
        for role in user_job_roles:
            role_words = role.lower().split()
            if all(w in job_title_lower for w in role_words):
                title_bonus = 1.0
                break
            if any(w in job_title_lower for w in role_words):
                title_bonus = max(title_bonus, 0.5)

    # ── Final weighted score ───────────────────────────────────────────────────
    # Keyword overlap weighted higher (50%) since it's more reliable than TF-IDF
    # on short job descriptions
    score = (tfidf_score * 0.40 + keyword_overlap * 0.50 + title_bonus * 0.10) * 100
    score = round(min(score, 100.0), 1)

    return {
        "score": score,
        "matched_keywords": sorted(set(matched_kw))[:30],
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
    Returns only jobs above threshold, sorted by score descending.
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
