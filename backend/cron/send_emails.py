"""
Cron Step 3: Send Email Digests
Run after match_jobs.py.
Sends daily / weekly email digests based on user preferences.
"""
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from services.supabase_client import get_service_client
from services.email_service import send_daily_digest


def should_send_today(frequency: str) -> bool:
    if frequency == "daily":
        return True
    if frequency == "weekly":
        return datetime.now(tz=timezone.utc).weekday() == 0  # Monday
    return False


def run():
    svc = get_service_client()
    today_cutoff = (datetime.now(tz=timezone.utc) - timedelta(hours=25)).isoformat()

    # Get all users with email enabled
    settings_res = svc.table("user_settings").select(
        "user_id, notification_email, email_frequency, match_threshold, job_retention_days"
    ).neq("email_frequency", "never").execute()
    users_settings = settings_res.data or []

    print(f"[Email] {len(users_settings)} users with email enabled.")
    sent_count = 0

    for s in users_settings:
        if not should_send_today(s.get("email_frequency", "daily")):
            continue

        user_id = s["user_id"]
        to_email = s.get("notification_email")
        if not to_email:
            continue

        threshold = s.get("match_threshold", 70)
        retention = s.get("job_retention_days", 7)

        # Fetch unsent matches from last 25 hours above threshold
        matches_res = svc.table("job_matches").select(
            "id, match_score, matched_keywords, job_id"
        ).eq("user_id", user_id).eq("sent_in_email", False).gte(
            "match_score", threshold
        ).gte("created_at", today_cutoff).order("match_score", desc=True).execute()

        matches = matches_res.data or []
        if not matches:
            print(f"[Email] User {user_id[:8]}…: no new matches, skipping.")
            continue

        # Fetch job details for each match
        job_ids = [m["job_id"] for m in matches]
        jobs_res = svc.table("jobs").select(
            "id, title, location, job_type, apply_url, companies(name)"
        ).in_("id", job_ids).execute()
        jobs_by_id = {j["id"]: j for j in (jobs_res.data or [])}

        # Build payload for email
        payload = []
        for m in matches:
            job = jobs_by_id.get(m["job_id"])
            if job:
                company = job.get("companies") or {}
                payload.append({
                    "job": {
                        "title": job["title"],
                        "company_name": company.get("name", ""),
                        "location": job.get("location", "India"),
                        "apply_url": job["apply_url"],
                    },
                    "match": {
                        "match_score": m["match_score"],
                        "matched_keywords": m.get("matched_keywords", []),
                    },
                })

        if not payload:
            continue

        # Get user's name from auth (use email prefix as fallback)
        user_name = to_email.split("@")[0].replace(".", " ").title()

        success = send_daily_digest(
            to_email=to_email,
            user_name=user_name,
            matches_with_jobs=payload,
            threshold=threshold,
        )

        if success:
            # Mark matches as sent
            match_ids = [m["id"] for m in matches]
            svc.table("job_matches").update({"sent_in_email": True}).in_("id", match_ids).execute()
            print(f"[Email] Sent to {to_email}: {len(payload)} matches.")
            sent_count += 1
        else:
            print(f"[Email] Failed to send to {to_email}.")

    print(f"\n[Email] Done. Emails sent: {sent_count}")


if __name__ == "__main__":
    run()
