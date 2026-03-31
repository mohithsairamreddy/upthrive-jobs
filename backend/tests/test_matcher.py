"""Tests for the pure Python TF-IDF matching engine."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services.matcher import compute_match, batch_match

def test_high_match():
    result = compute_match(
        resume_text="Python developer with 5 years experience in FastAPI Django REST API AWS Docker Kubernetes CI/CD",
        resume_keywords=["python", "fastapi", "aws", "docker", "kubernetes"],
        resume_skills=["python", "fastapi", "aws", "docker"],
        job_title="Senior Python Backend Engineer",
        job_description="We need a Python engineer experienced in FastAPI. Must know AWS and Docker. Kubernetes is a plus. REST API design required.",
        user_job_roles=["Python Engineer", "Backend Engineer"],
    )
    assert result["score"] > 50, f"Expected >50, got {result['score']}"
    assert "python" in result["matched_keywords"]
    assert "fastapi" in result["matched_keywords"]

def test_low_match():
    result = compute_match(
        resume_text="Java Spring Boot Hibernate SQL Oracle enterprise backend developer",
        resume_keywords=["java", "spring", "hibernate", "sql"],
        resume_skills=["java", "spring boot"],
        job_title="React Frontend Developer",
        job_description="Looking for React developer with TypeScript CSS HTML experience. Must know Redux and GraphQL.",
        user_job_roles=["Frontend Developer"],
    )
    assert result["score"] < 40, f"Expected <40, got {result['score']}"

def test_empty_inputs():
    result = compute_match("", [], [], "", "", [])
    assert result["score"] == 0.0

def test_batch_match_threshold():
    resume = {
        "parsed_text": "Python machine learning data science TensorFlow pandas numpy",
        "keywords": ["python", "machine learning", "tensorflow"],
        "parsed_skills": ["python", "tensorflow", "pandas"],
    }
    jobs = [
        {"id": "1", "title": "ML Engineer", "description": "Python machine learning TensorFlow deep learning"},
        {"id": "2", "title": "Java Developer", "description": "Java Spring Boot Hibernate enterprise"},
        {"id": "3", "title": "Data Scientist Python", "description": "Python data science pandas numpy statistics"},
    ]
    results = batch_match(resume, jobs, user_job_roles=["ML Engineer"], threshold=30)
    assert len(results) >= 1
    ids = [r["job_id"] for r in results]
    assert "2" not in ids  # Java job should not match Python resume above threshold
    for r in results:
        assert r["match_score"] >= 30

def test_score_capped_at_100():
    result = compute_match(
        resume_text="python python python fastapi fastapi fastapi aws aws",
        resume_keywords=["python", "fastapi", "aws"],
        resume_skills=["python", "fastapi", "aws"],
        job_title="Python FastAPI AWS Developer",
        job_description="python fastapi aws python fastapi aws python fastapi",
        user_job_roles=["Python Developer"],
    )
    assert result["score"] <= 100.0

def test_matched_keywords_not_empty_for_good_match():
    result = compute_match(
        resume_text="React TypeScript frontend developer with experience in Node.js",
        resume_keywords=["react", "typescript", "node.js"],
        resume_skills=["react", "typescript"],
        job_title="Frontend React Developer",
        job_description="We need React TypeScript developer for frontend work",
        user_job_roles=["Frontend Developer"],
    )
    assert len(result["matched_keywords"]) > 0

def test_title_bonus_applied():
    result_with_role = compute_match(
        resume_text="software engineer python developer",
        resume_keywords=["python"],
        resume_skills=["python"],
        job_title="Senior Software Engineer",
        job_description="Python development work",
        user_job_roles=["Software Engineer"],
    )
    result_without_role = compute_match(
        resume_text="software engineer python developer",
        resume_keywords=["python"],
        resume_skills=["python"],
        job_title="Senior Software Engineer",
        job_description="Python development work",
        user_job_roles=[],
    )
    assert result_with_role["score"] >= result_without_role["score"]
