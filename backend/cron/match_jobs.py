"""
Cron Step 2: Match Jobs to Users
Run after scrape_jobs.py.
For every user with a resume, compute match scores for jobs scraped today.
Only saves matches above the user's threshold.
"""
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from services.supabase_client import get_service_client
from services.matcher import batch_match


def run():
    svc = get_service_client()

    # Fetch all users who have a resume
    resumes_res = svc.table("resumes").select(
        "user_id, parsed_text, keywords, parsed_skills"
    ).execute()
    resumes = resumes_res.data or []
    print(f"[Match] {len(resumes)} users with resumes.")

    # Fetch jobs scraped in last 25 hours (give buffer for scrape time)
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(hours=25)).isoformat()
    jobs_res = svc.table("jobs").select(
        "id, title, description, location, job_type, company_id"
    ).gte("scraped_at", cutoff).execute()
    jobs = jobs_res.data or []
    print(f"[Match] {len(jobs)} new jobs to match against.")

    if not jobs:
        print("[Match] No new jobs today. Exiting.")
        return

    total_matches = 0

    for resume in resumes:
        user_id = resume["user_id"]

        # Get user settings
        settings_res = svc.table("user_settings").select(
            "match_threshold, job_roles, job_retention_days"
        ).eq("user_id", user_id).single().execute()
        settings = settings_res.data or {}
        threshold = settings.get("match_threshold", 70)
        job_roles = settings.get("job_roles") or []

        # Get user's enabled companies
        prefs_res = svc.table("user_companies").select(
            "company_id, is_enabled"
        ).eq("user_id", user_id).execute()
        disabled = {r["company_id"] for r in (prefs_res.data or []) if not r["is_enabled"]}

        # Filter jobs by user's enabled companies
        user_jobs = [j for j in jobs if j.get("company_id") not in disabled]

        if not user_jobs:
            continue

        # Compute matches
        matches = batch_match(
            resume=resume,
            jobs=user_jobs,
            user_job_roles=job_roles,
            threshold=threshold,
        )

        # Upsert matches into DB
        inserted = 0
        for m in matches:
            try:
                svc.table("job_matches").upsert(
                    {
                        "user_id": user_id,
                        "job_id": m["job_id"],
                        "match_score": m["match_score"],
                        "matched_keywords": m["matched_keywords"],
                        "sent_in_email": False,
                    },
                    on_conflict="user_id,job_id",
                ).execute()
                inserted += 1
            except Exception as e:
                print(f"[Match] DB error for user {user_id}: {e}")

        total_matches += inserted
        print(f"[Match] User {user_id[:8]}…: {inserted} matches (threshold={threshold}%)")

    print(f"\n[Match] Done. Total matches saved: {total_matches}")


if __name__ == "__main__":
    run()
