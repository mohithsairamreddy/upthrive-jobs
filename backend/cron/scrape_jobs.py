"""
Cron Step 1: Scrape Jobs
Run daily via GitHub Actions.
Scrapes all active companies and upserts jobs into Supabase.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from services.supabase_client import get_service_client
from services.ghost_detector import filter_ghost_jobs
from services.jd_scorer import compute_jd_quality
from scrapers import scrape_company


async def run():
    svc = get_service_client()

    # Fetch all active companies
    companies_res = svc.table("companies").select("*").eq("is_active", True).execute()
    companies = companies_res.data or []
    print(f"[Scrape] Found {len(companies)} active companies.")

    total_new = 0
    total_ghosts = 0

    for company in companies:
        print(f"\n[Scrape] Processing: {company['name']} ({company['scrape_method']})")
        try:
            jobs = await scrape_company(company)
        except Exception as e:
            print(f"[Scrape] ERROR scraping {company['name']}: {e}")
            jobs = []

        if not jobs:
            continue

        # Fetch existing jobs for this company (for ghost detection)
        existing_res = svc.table("jobs").select(
            "id, title, description, posted_at, apply_url"
        ).eq("company_id", company["id"]).execute()
        existing_jobs = existing_res.data or []

        # Ghost job detection: reuse original posted_at for reposts
        jobs, ghost_count = filter_ghost_jobs(jobs, existing_jobs)
        if ghost_count:
            total_ghosts += ghost_count
            print(f"[Scrape] {company['name']}: {ghost_count} ghost/repost job(s) detected — original dates preserved.")

        # Upsert jobs (skip duplicates based on company_id + apply_url)
        inserted = 0
        for job in jobs:
            if not job.get("apply_url") or not job.get("title"):
                continue
            # Compute and attach JD quality score
            job["jd_quality_score"] = compute_jd_quality(job.get("description", ""))
            try:
                result = svc.table("jobs").upsert(
                    job,
                    on_conflict="company_id,apply_url",
                ).execute()
                if result.data:
                    inserted += 1
            except Exception as e:
                print(f"[Scrape] DB upsert error for {job.get('title', 'unknown')}: {e}")

        total_new += inserted
        print(f"[Scrape] {company['name']}: {inserted}/{len(jobs)} jobs saved.")

        # Update last_scraped timestamp
        svc.table("companies").update({"last_scraped": "now()"}).eq("id", company["id"]).execute()

    # Cleanup jobs older than 30 days
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=30)).isoformat()
    svc.table("jobs").delete().lt("scraped_at", cutoff).execute()
    print(f"\n[Scrape] Cleanup: removed jobs older than 30 days.")
    print(f"[Scrape] Ghost jobs detected this run: {total_ghosts}")
    print(f"[Scrape] Done. Total new/updated jobs: {total_new}")


if __name__ == "__main__":
    asyncio.run(run())
