"""
ATS Resume Parser
Extracts skills, job titles, education, keywords from PDF/DOCX resumes.
Uses pdfminer + spaCy (no paid API needed).
"""
import io
import re
import spacy
from pdfminer.high_level import extract_text as pdf_extract
from docx import Document

# Load spaCy model (downloaded during setup)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import subprocess
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"], check=True)
    nlp = spacy.load("en_core_web_sm")

# ── Curated skills list (tech + non-tech) ─────────────────────────────────────
SKILLS_DB = {
    # Programming languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "kotlin", "swift", "ruby", "php", "scala", "r", "matlab", "dart", "perl",
    # Web
    "react", "next.js", "vue", "angular", "html", "css", "tailwind", "bootstrap",
    "node.js", "express", "fastapi", "django", "flask", "spring", "laravel",
    # Data / ML
    "machine learning", "deep learning", "nlp", "computer vision", "tensorflow",
    "pytorch", "keras", "scikit-learn", "pandas", "numpy", "matplotlib", "seaborn",
    "data analysis", "data science", "statistics", "a/b testing", "sql", "nosql",
    "spark", "hadoop", "airflow", "dbt", "etl", "data pipeline",
    # Cloud / DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd",
    "github actions", "jenkins", "ansible", "linux", "bash", "shell scripting",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb",
    "supabase", "firebase", "sqlite", "cassandra", "neo4j",
    # Mobile
    "android", "ios", "react native", "flutter", "xamarin",
    # Tools
    "git", "jira", "confluence", "figma", "postman", "graphql", "rest api",
    "microservices", "system design", "agile", "scrum", "kanban",
    # Soft skills
    "leadership", "communication", "teamwork", "problem solving", "project management",
    "product management", "stakeholder management", "mentoring",
    # Domain
    "fintech", "edtech", "healthtech", "e-commerce", "saas", "b2b", "b2c",
}

# Common job titles to detect
JOB_TITLE_PATTERNS = [
    r"software engineer", r"senior software engineer", r"staff engineer",
    r"data scientist", r"data analyst", r"data engineer", r"ml engineer",
    r"machine learning engineer", r"ai engineer", r"research engineer",
    r"frontend developer", r"backend developer", r"full.?stack developer",
    r"devops engineer", r"site reliability engineer", r"sre",
    r"product manager", r"program manager", r"project manager",
    r"engineering manager", r"tech lead", r"architect",
    r"android developer", r"ios developer", r"mobile developer",
    r"qa engineer", r"test engineer", r"automation engineer",
    r"ui/ux designer", r"ux researcher", r"designer",
    r"business analyst", r"solution architect", r"consultant",
]


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extract raw text from PDF or DOCX bytes."""
    name = filename.lower()
    if name.endswith(".pdf"):
        return pdf_extract(io.BytesIO(file_bytes)) or ""
    elif name.endswith(".docx"):
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    return ""


def extract_skills(text: str) -> list[str]:
    """Match skills from SKILLS_DB against resume text (case-insensitive)."""
    text_lower = text.lower()
    found = []
    for skill in SKILLS_DB:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
    return sorted(set(found))


def extract_job_titles(text: str) -> list[str]:
    """Find job titles mentioned in the resume."""
    text_lower = text.lower()
    found = []
    for pattern in JOB_TITLE_PATTERNS:
        if re.search(pattern, text_lower):
            # Capitalize nicely
            match = re.search(pattern, text_lower)
            if match:
                found.append(match.group(0).title())
    return list(set(found))


def extract_education(text: str) -> str:
    """Extract highest education level."""
    text_lower = text.lower()
    if any(x in text_lower for x in ["ph.d", "phd", "doctorate"]):
        return "PhD"
    if any(x in text_lower for x in ["m.tech", "m.e.", "mtech", "master of technology"]):
        return "M.Tech"
    if any(x in text_lower for x in ["mba", "master of business"]):
        return "MBA"
    if any(x in text_lower for x in ["m.sc", "msc", "master of science", "m.s."]):
        return "M.Sc"
    if any(x in text_lower for x in ["b.tech", "b.e.", "btech", "bachelor of technology"]):
        return "B.Tech"
    if any(x in text_lower for x in ["b.sc", "bsc", "bachelor of science"]):
        return "B.Sc"
    if any(x in text_lower for x in ["b.com", "bcom"]):
        return "B.Com"
    if "bachelor" in text_lower:
        return "Bachelor's"
    if "diploma" in text_lower:
        return "Diploma"
    return "Not specified"


def extract_experience_years(text: str) -> float:
    """Estimate total years of experience from resume text."""
    patterns = [
        r"(\d+)\+?\s*years?\s+of\s+experience",
        r"(\d+)\+?\s*years?\s+experience",
        r"experience\s+of\s+(\d+)\+?\s*years?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            return float(match.group(1))
    return 0.0


def extract_keywords(text: str) -> list[str]:
    """
    NLP-based keyword extraction using spaCy NER + noun chunks.
    Returns meaningful tokens for TF-IDF matching.
    """
    doc = nlp(text[:50000])  # limit to 50k chars for performance
    keywords = set()

    # Named entities (ORG, PRODUCT, etc.)
    for ent in doc.ents:
        if ent.label_ in ("ORG", "PRODUCT", "GPE", "WORK_OF_ART"):
            keywords.add(ent.text.lower().strip())

    # Noun chunks (tech terms usually appear as noun phrases)
    for chunk in doc.noun_chunks:
        token = chunk.text.lower().strip()
        if 2 < len(token) < 50 and not token.isdigit():
            keywords.add(token)

    # Also include matched skills as keywords
    skills = extract_skills(text)
    keywords.update(skills)

    return sorted(keywords)


def parse_resume(file_bytes: bytes, filename: str) -> dict:
    """
    Full resume parse pipeline.
    Returns structured dict ready to store in DB.
    """
    text = extract_text_from_file(file_bytes, filename)
    if not text.strip():
        raise ValueError("Could not extract text from resume. Ensure it is not scanned/image-only.")

    return {
        "parsed_text": text[:10000],          # store first 10k chars
        "parsed_skills": extract_skills(text),
        "job_titles": extract_job_titles(text),
        "education": extract_education(text),
        "experience_years": extract_experience_years(text),
        "keywords": extract_keywords(text),
    }
