"""Tests for ghost job detection."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ghost_detector import find_original, filter_ghost_jobs, GHOST_THRESHOLD

REAL_DESC = (
    "We are looking for a Senior Software Engineer to join our platform team. "
    "You will design and build scalable microservices using Python and Go. "
    "Requirements: 5+ years backend experience, strong knowledge of distributed systems, "
    "proficiency in AWS, Kubernetes, PostgreSQL. Experience with Kafka and Redis is a plus. "
    "You will work closely with product and design teams in a fast-paced startup environment."
)

REPOST_DESC = (
    "We are looking for a Senior Software Engineer to join our platform team! "
    "You will design and build scalable microservices using Python and Go. "
    "Requirements: 5+ years backend experience, strong knowledge of distributed systems, "
    "proficiency in AWS, Kubernetes, PostgreSQL. Experience with Kafka and Redis is a plus. "
    "You will work closely with product and design teams in a fast-paced startup environment."
)  # Nearly identical — one char difference

DIFFERENT_DESC = (
    "We are hiring a Data Scientist to work on recommendation systems. "
    "You will build ML models using PyTorch and TensorFlow for our personalization engine. "
    "Requirements: PhD or Masters in CS/Stats, strong Python skills, experience with "
    "large-scale data pipelines. Familiarity with Spark and MLflow is a plus."
)


def make_existing(desc, posted_at="2024-01-01T00:00:00"):
    return {"title": "Senior Software Engineer", "description": desc, "posted_at": posted_at}


def make_job(title, desc):
    return {
        "company_id": "c1",
        "title": title,
        "description": desc,
        "apply_url": "https://example.com/job/1",
        "posted_at": "2024-03-01T00:00:00",
    }


# ── Unit tests ────────────────────────────────────────────────────────────────

def test_exact_repost_detected():
    existing = [make_existing(REAL_DESC, "2024-01-10T00:00:00")]
    match = find_original({"title": "SWE", "description": REAL_DESC}, existing)
    assert match is not None, "Identical description should be detected as repost"


def test_near_duplicate_detected():
    existing = [make_existing(REAL_DESC, "2024-01-10T00:00:00")]
    match = find_original({"title": "SWE", "description": REPOST_DESC}, existing)
    assert match is not None, "Near-identical description should be detected as repost"


def test_different_job_not_flagged():
    existing = [make_existing(REAL_DESC, "2024-01-10T00:00:00")]
    match = find_original({"title": "Data Scientist", "description": DIFFERENT_DESC}, existing)
    assert match is None, "Different role should NOT be flagged as repost"


def test_original_date_preserved():
    original_date = "2024-01-05T00:00:00"
    existing = [make_existing(REAL_DESC, original_date)]
    new_job = make_job("Senior SWE", REPOST_DESC)

    processed, ghost_count = filter_ghost_jobs([new_job], existing)
    assert ghost_count == 1
    assert processed[0]["posted_at"] == original_date, "Original posted_at must be preserved"


def test_fresh_job_keeps_new_date():
    existing = [make_existing(REAL_DESC, "2024-01-05T00:00:00")]
    new_job = make_job("Data Scientist", DIFFERENT_DESC)
    new_date = new_job["posted_at"]

    processed, ghost_count = filter_ghost_jobs([new_job], existing)
    assert ghost_count == 0
    assert processed[0]["posted_at"] == new_date, "Fresh job should keep its own date"


def test_empty_existing_no_false_positive():
    new_job = make_job("SWE", REAL_DESC)
    processed, ghost_count = filter_ghost_jobs([new_job], [])
    assert ghost_count == 0
    assert len(processed) == 1


def test_short_description_skipped():
    """Very short descriptions can't be reliably compared — should not trigger detection."""
    existing = [make_existing("Apply at https://example.com", "2024-01-01T00:00:00")]
    match = find_original({"title": "SWE", "description": "Apply at https://example.com"}, existing)
    assert match is None, "Short placeholder descriptions should not trigger ghost detection"


def test_multiple_jobs_mixed():
    existing = [make_existing(REAL_DESC, "2024-01-05T00:00:00")]
    jobs = [
        make_job("Senior SWE", REPOST_DESC),    # ghost
        make_job("Data Scientist", DIFFERENT_DESC),  # fresh
    ]
    processed, ghost_count = filter_ghost_jobs(jobs, existing)
    assert ghost_count == 1
    assert len(processed) == 2
