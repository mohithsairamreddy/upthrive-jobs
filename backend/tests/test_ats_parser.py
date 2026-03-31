"""Tests for the ATS resume parser."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services.ats_parser import (
    extract_skills, extract_job_titles, extract_education,
    extract_experience_years, extract_keywords
)

SAMPLE_RESUME = """
John Doe | Software Engineer
Email: john@example.com

EXPERIENCE
Senior Software Engineer - Razorpay (2021-Present)
- Built REST APIs using Python and FastAPI
- Deployed microservices on AWS using Docker and Kubernetes
- Led a team of 5 engineers, worked with React frontend

Software Engineer - Flipkart (2019-2021)
- Worked with Python Django for backend development
- Used PostgreSQL and Redis for data storage
- Implemented CI/CD pipelines using GitHub Actions

EDUCATION
B.Tech in Computer Science - IIT Delhi (2019)

SKILLS
Python, FastAPI, Django, React, AWS, Docker, Kubernetes, PostgreSQL, Redis,
Machine Learning, TensorFlow, Git, Agile, Scrum
"""

def test_extract_skills_python():
    skills = extract_skills(SAMPLE_RESUME)
    assert "python" in skills

def test_extract_skills_aws():
    skills = extract_skills(SAMPLE_RESUME)
    assert "aws" in skills

def test_extract_skills_docker():
    skills = extract_skills(SAMPLE_RESUME)
    assert "docker" in skills

def test_extract_skills_react():
    skills = extract_skills(SAMPLE_RESUME)
    assert "react" in skills

def test_extract_skills_returns_list():
    skills = extract_skills(SAMPLE_RESUME)
    assert isinstance(skills, list)
    assert len(skills) > 0

def test_extract_skills_case_insensitive():
    text = "Expert in PYTHON and JavaScript developer"
    skills = extract_skills(text)
    assert "python" in skills
    assert "javascript" in skills

def test_extract_job_titles():
    titles = extract_job_titles(SAMPLE_RESUME)
    assert isinstance(titles, list)
    assert len(titles) > 0

def test_extract_education_btech():
    edu = extract_education(SAMPLE_RESUME)
    assert edu == "B.Tech"

def test_extract_education_phd():
    text = "PhD in Computer Science from IIT Bombay"
    assert extract_education(text) == "PhD"

def test_extract_education_mba():
    text = "MBA from IIM Ahmedabad"
    assert extract_education(text) == "MBA"

def test_extract_education_default():
    text = "Completed high school education"
    result = extract_education(text)
    assert isinstance(result, str)

def test_extract_experience_years():
    text = "I have 5 years of experience in software development"
    years = extract_experience_years(text)
    assert years == 5.0

def test_extract_experience_years_not_found():
    text = "Recent graduate with internship experience"
    years = extract_experience_years(text)
    assert years == 0.0

def test_extract_keywords_returns_list():
    keywords = extract_keywords(SAMPLE_RESUME)
    assert isinstance(keywords, list)

def test_extract_keywords_includes_skills():
    keywords = extract_keywords(SAMPLE_RESUME)
    assert "python" in keywords

def test_extract_skills_empty_text():
    skills = extract_skills("")
    assert skills == []

def test_no_false_positive_skills():
    text = "I enjoy cooking and hiking on weekends"
    skills = extract_skills(text)
    assert "python" not in skills
    assert "react" not in skills
