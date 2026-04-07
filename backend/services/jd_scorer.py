"""
JD Quality Scorer
Scores a job description from 0.0 (garbage) to 1.0 (high quality).

Signals:
  - Skill density: real tech/domain skills per 100 words
  - Filler penalty: vague corporate buzzword ratio
  - Unicorn penalty: too many unrelated stacks = unrealistic role
  - Length: very short JDs lack detail; very long may be copy-paste noise
  - Structure signal: presence of concrete sections (responsibilities, requirements)

Score interpretation:
  >= 0.65  High quality  — specific, focused JD
  0.35–0.65 Medium       — some vagueness, still useful
  < 0.35  Low quality    — vague, unicorn-hunting, or placeholder
"""
import re
from collections import Counter


# Real technical/domain skills — any match is a positive quality signal
SKILL_TERMS = {
    # Languages
    "python", "java", "javascript", "typescript", "golang", "go", "rust", "scala",
    "kotlin", "swift", "ruby", "php", "c++", "c#", "r", "matlab", "dart",
    # Web
    "react", "angular", "vue", "nextjs", "node", "django", "fastapi", "flask",
    "spring", "express", "graphql", "rest", "grpc", "protobuf",
    # Data / ML
    "sql", "nosql", "spark", "kafka", "airflow", "dbt", "hadoop", "hive",
    "pandas", "numpy", "tensorflow", "pytorch", "sklearn", "mlflow",
    "llm", "nlp", "bert", "transformer", "rag", "langchain", "huggingface",
    "tableau", "powerbi", "looker", "bigquery", "snowflake", "databricks", "redshift",
    # Cloud / DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "helm",
    "ci/cd", "jenkins", "gitlab", "github", "linux", "bash",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "dynamodb", "supabase", "firebase", "clickhouse",
    # Mobile
    "android", "ios", "flutter", "react native",
    # Architecture
    "microservices", "distributed", "event-driven", "cqrs", "system design",
    "high availability", "scalability", "fault tolerance",
}

# Filler phrases that add word count without substance
FILLER_TERMS = {
    "team player", "fast-paced", "wear many hats", "self-starter", "go-getter",
    "rockstar", "ninja", "wizard", "guru", "passionate", "dynamic", "synergy",
    "leverage", "ecosystem", "holistic", "bandwidth", "circle back", "deep dive",
    "move the needle", "think outside the box", "low-hanging fruit", "best practices",
    "detail-oriented", "proactive", "motivated", "enthusiastic", "excellent communication",
    "strong communication", "good communication", "interpersonal skills", "multitask",
    "fast learner", "quick learner", "results-driven", "solution-oriented",
    "thought leader", "take ownership", "hit the ground running", "culture fit",
    "startup experience", "startup environment", "scrappy", "hustle",
}

# Concrete structural markers — good JDs have these
STRUCTURE_MARKERS = [
    r"\bresponsibilit",
    r"\brequirement",
    r"\bqualification",
    r"\bwhat you.ll do",
    r"\bwhat we.re looking",
    r"\bwho you are",
    r"\bmust.have",
    r"\bnice.to.have",
    r"\bwhat you.ll bring",
    r"\byou will",
    r"\byour role",
]


def _words(text: str) -> list[str]:
    return re.sub(r"[^a-z\s]", " ", text.lower()).split()


def compute_jd_quality(description: str) -> float:
    """
    Returns a quality score in [0.0, 1.0].
    Higher = more specific, focused, and informative JD.
    """
    if not description or len(description.strip()) < 50:
        return 0.0

    text_lower = description.lower()
    words = _words(description)
    word_count = max(len(words), 1)

    # ── 1. Skill density (0–1) ────────────────────────────────────────────────
    # Count distinct skills mentioned (not raw occurrences)
    skill_hits = sum(1 for skill in SKILL_TERMS if skill in text_lower)
    # Normalize: 8+ distinct skills = full score; diminishing returns after 15
    skill_score = min(skill_hits / 8.0, 1.0)

    # ── 2. Filler penalty (0–1, lower is worse) ───────────────────────────────
    filler_hits = sum(1 for phrase in FILLER_TERMS if phrase in text_lower)
    filler_ratio = filler_hits / max(len(FILLER_TERMS), 1)
    filler_score = max(0.0, 1.0 - filler_ratio * 8)  # even 1-2 fillers reduce score

    # ── 3. Unicorn hunting penalty ────────────────────────────────────────────
    # Requiring too many unrelated stacks = unrealistic
    STACK_GROUPS = [
        {"python", "django", "fastapi", "flask"},
        {"java", "spring", "kotlin"},
        {"javascript", "typescript", "react", "angular", "vue", "node"},
        {"golang", "go"},
        {"rust"},
        {"ruby", "rails"},
        {"php", "laravel"},
        {"scala", "spark"},
        {"swift", "ios"},
        {"android", "kotlin"},
    ]
    stacks_required = sum(
        1 for group in STACK_GROUPS
        if any(skill in text_lower for skill in group)
    )
    # 1-3 stacks is normal; 4+ is a yellow flag; 6+ is unicorn hunting
    unicorn_penalty = max(0.0, (stacks_required - 3) * 0.12)
    unicorn_score = max(0.0, 1.0 - unicorn_penalty)

    # ── 4. Length score (0–1) ─────────────────────────────────────────────────
    # Ideal JD: 150–600 words. Shorter = vague; longer = noise/copy-paste.
    if word_count < 80:
        length_score = word_count / 80.0
    elif word_count <= 600:
        length_score = 1.0
    else:
        length_score = max(0.5, 1.0 - (word_count - 600) / 1000.0)

    # ── 5. Structure signal (0–1) ─────────────────────────────────────────────
    structure_hits = sum(1 for pat in STRUCTURE_MARKERS if re.search(pat, text_lower))
    structure_score = min(structure_hits / 3.0, 1.0)

    # ── Weighted final score ──────────────────────────────────────────────────
    score = (
        skill_score     * 0.40 +
        filler_score    * 0.20 +
        unicorn_score   * 0.15 +
        length_score    * 0.15 +
        structure_score * 0.10
    )

    return round(min(score, 1.0), 3)


def quality_label(score: float) -> str:
    """Human-readable label for the quality score."""
    if score >= 0.65:
        return "high"
    if score >= 0.35:
        return "medium"
    return "low"
