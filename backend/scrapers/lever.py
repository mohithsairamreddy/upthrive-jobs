"""
Lever ATS Scraper
Uses the public Lever Postings API — no auth needed.
Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
"""
import httpx
import re
from datetime import datetime, timezone


LEVER_API = "https://api.lever.co/v0/postings/{slug}?mode=json&limit=250"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; UpthriveBot/1.0)"}


def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


async def scrape(company: dict) -> list[dict]:
    """
    Fetch jobs from Lever API for a given company.
    Returns list of job dicts ready to insert into DB.
    """
    slug = company.get("ats_slug")
    if not slug:
        print(f"[Lever] No slug for {company['name']}, skipping.")
        return []

    url = LEVER_API.format(slug=slug)
    jobs = []

    async with httpx.AsyncClient(timeout=30, headers=HEADERS) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            print(f"[Lever] {company['name']} HTTP {e.response.status_code}")
            return []
        except Exception as e:
            print(f"[Lever] {company['name']} error: {e}")
            return []

    for item in data:
        location = item.get("categories", {}).get("location") or "India"
        commitment = item.get("categories", {}).get("commitment") or "Full-time"

        # Build description from lists
        desc_parts = []
        for section in item.get("lists", []):
            desc_parts.append(section.get("text", ""))
            for li in section.get("content", "").split("<li>"):
                clean = _strip_html(li).strip()
                if clean:
                    desc_parts.append(f"• {clean}")

        # Additional text
        if item.get("additional"):
            desc_parts.append(_strip_html(item["additional"]))

        description = "\n".join(desc_parts)[:5000]

        # Parse timestamp (Lever uses ms since epoch)
        posted_at = None
        ts = item.get("createdAt")
        if ts:
            try:
                posted_at = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).isoformat()
            except Exception:
                pass

        jobs.append({
            "company_id": company["id"],
            "title": item.get("text", ""),
            "description": description,
            "location": location,
            "job_type": commitment,
            "apply_url": item.get("hostedUrl", ""),
            "posted_at": posted_at,
        })

    print(f"[Lever] {company['name']}: {len(jobs)} jobs fetched")
    return jobs
