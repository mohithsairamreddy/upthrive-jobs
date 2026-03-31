"""
Greenhouse ATS Scraper
Uses the public Greenhouse Jobs Board API — no auth needed.
Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
"""
import httpx
from datetime import datetime


GREENHOUSE_API = "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; UpthriveBot/1.0)"}


async def scrape(company: dict) -> list[dict]:
    """
    Fetch jobs from Greenhouse API for a given company.
    company dict must have: id, ats_slug
    Returns list of job dicts ready to insert into DB.
    """
    slug = company.get("ats_slug")
    if not slug:
        print(f"[Greenhouse] No slug for {company['name']}, skipping.")
        return []

    url = GREENHOUSE_API.format(slug=slug)
    jobs = []

    async with httpx.AsyncClient(timeout=30, headers=HEADERS) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            print(f"[Greenhouse] {company['name']} HTTP {e.response.status_code}")
            return []
        except Exception as e:
            print(f"[Greenhouse] {company['name']} error: {e}")
            return []

    for item in data.get("jobs", []):
        # Parse location
        location_parts = []
        for loc in item.get("offices", []):
            if loc.get("name"):
                location_parts.append(loc["name"])
        location = ", ".join(location_parts) or "India"

        # Determine job type
        job_type = "Full-time"
        title_lower = item.get("title", "").lower()
        if "intern" in title_lower:
            job_type = "Internship"
        elif "contract" in title_lower or "freelance" in title_lower:
            job_type = "Contract"

        # Parse date
        posted_at = None
        if item.get("updated_at"):
            try:
                posted_at = datetime.fromisoformat(item["updated_at"].replace("Z", "+00:00")).isoformat()
            except Exception:
                pass

        # Content (job description)
        content = ""
        if item.get("content"):
            # Strip HTML tags
            import re
            content = re.sub(r"<[^>]+>", " ", item["content"])
            content = re.sub(r"\s+", " ", content).strip()[:5000]

        jobs.append({
            "company_id": company["id"],
            "title": item.get("title", ""),
            "description": content,
            "location": location,
            "job_type": job_type,
            "apply_url": item.get("absolute_url", ""),
            "posted_at": posted_at,
        })

    print(f"[Greenhouse] {company['name']}: {len(jobs)} jobs fetched")
    return jobs
