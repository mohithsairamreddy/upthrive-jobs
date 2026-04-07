"""
Ghost Job Detector
Detects reposted/stale jobs by computing TF-IDF cosine similarity between
a new job and existing jobs at the same company.

A "ghost job" is one that keeps being reposted with minimal changes —
a strong signal that the role is either filled, on hold, or never real.
By preserving the original posted_at date on reposts, a simple date filter
(e.g. exclude jobs older than 30 days) will naturally remove ghost jobs.

Strategy (inspired by haveloc.com):
  1. For each scraped job, compare its description against existing DB jobs
     from the same company.
  2. If cosine similarity >= GHOST_THRESHOLD, treat it as a repost:
       - Keep original posted_at (don't reset the date)
       - Still upsert so the 30-day cleanup works correctly
  3. Log ghost job rate per company so you can tune the threshold.
"""
import math
import re
from collections import Counter


GHOST_THRESHOLD = 0.82   # similarity above this = likely repost


# ── Lightweight tokenizer (no external deps) ──────────────────────────────────

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
    "will", "www", "http", "https", "com", "org", "apply", "please",
}


def _tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    return [w for w in text.split() if len(w) > 2 and w not in _STOPWORDS]


def _cosine(tokens_a: list[str], tokens_b: list[str]) -> float:
    if not tokens_a or not tokens_b:
        return 0.0

    tf_a = Counter(tokens_a)
    tf_b = Counter(tokens_b)
    vocab = set(tf_a) | set(tf_b)

    vec_a, vec_b = {}, {}
    for term in vocab:
        in_a = 1 if tf_a.get(term, 0) > 0 else 0
        in_b = 1 if tf_b.get(term, 0) > 0 else 0
        idf = math.log(3 / (in_a + in_b + 1)) + 1
        vec_a[term] = (tf_a.get(term, 0) / len(tokens_a)) * idf
        vec_b[term] = (tf_b.get(term, 0) / len(tokens_b)) * idf

    dot = sum(vec_a[t] * vec_b.get(t, 0) for t in vec_a)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ── Public API ─────────────────────────────────────────────────────────────────

def find_original(new_job: dict, existing_jobs: list[dict]) -> dict | None:
    """
    Compare a new job against existing jobs from the same company.

    Returns the matching existing job if it's a repost, else None.
    The caller should then reuse existing_job['posted_at'] instead of
    setting a fresh timestamp — so the ghost job ages out naturally.
    """
    new_desc = new_job.get("description", "")
    new_title = new_job.get("title", "")

    # Very short descriptions can't be reliably compared — skip detection
    if len(new_desc) < 100:
        return None

    new_tokens = _tokenize(new_title + " " + new_desc)

    best_sim = 0.0
    best_match = None

    for existing in existing_jobs:
        # Same title is a strong prior signal
        existing_title = existing.get("title", "")
        existing_desc = existing.get("description", "")
        if not existing_desc or len(existing_desc) < 100:
            continue

        existing_tokens = _tokenize(existing_title + " " + existing_desc)
        sim = _cosine(new_tokens, existing_tokens)

        if sim > best_sim:
            best_sim = sim
            best_match = existing

    if best_sim >= GHOST_THRESHOLD:
        return best_match

    return None


def filter_ghost_jobs(
    new_jobs: list[dict],
    existing_jobs: list[dict],
) -> tuple[list[dict], int]:
    """
    Process a batch of newly scraped jobs for a single company.

    For each new job:
      - If it matches an existing job above threshold, preserve the
        original posted_at so the job continues aging normally.
      - Otherwise leave posted_at as-is (fresh job).

    Returns (processed_jobs, ghost_count).
    """
    ghost_count = 0
    processed = []

    for job in new_jobs:
        original = find_original(job, existing_jobs)
        if original:
            # Repost detected — freeze the original date
            job = dict(job)
            job["posted_at"] = original.get("posted_at") or job.get("posted_at")
            ghost_count += 1
        processed.append(job)

    return processed, ghost_count
