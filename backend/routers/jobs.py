from fastapi import APIRouter, Depends, Query
from services.supabase_client import get_service_client
from routers.auth import get_current_user
from typing import Optional
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/matches")
def get_matches(
    current_user: dict = Depends(get_current_user),
    min_score: Optional[int] = Query(None),
    location: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    days: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Return paginated job matches for the current user.
    Respects user's job_retention_days setting.
    Filters: min_score, location, job_type, company_id, days.
    """
    client = get_service_client()
    user_id = current_user["id"]

    # Get user settings for retention days and threshold
    settings_res = (
        client.table("user_settings")
        .select("match_threshold, job_retention_days")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    settings = settings_res.data or {}
    retention_days = settings.get("job_retention_days", 7)
    default_threshold = settings.get("match_threshold", 70)

    effective_min_score = min_score if min_score is not None else default_threshold
    effective_days = days if days is not None else retention_days

    # Compute cutoff date using Python datetime (PostgREST can't evaluate SQL expressions as filter values)
    cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=effective_days)).isoformat()

    # Step 1: Query job_matches with scalar filters only
    matches_res = (
        client.table("job_matches")
        .select("id, match_score, matched_keywords, created_at, sent_in_email, job_id")
        .eq("user_id", user_id)
        .gte("match_score", effective_min_score)
        .gte("created_at", cutoff)
        .order("match_score", desc=True)
        .execute()
    )
    all_matches = matches_res.data or []

    if not all_matches:
        return {
            "page": page,
            "page_size": page_size,
            "matches": [],
            "filters": {
                "min_score": effective_min_score,
                "days": effective_days,
            },
        }

    # Step 2: Fetch job details for all matched job_ids
    job_ids = list({m["job_id"] for m in all_matches})
    jobs_res = (
        client.table("jobs")
        .select("id, title, description, location, job_type, apply_url, posted_at, scraped_at, company_id,"
                "companies(id, name, logo_url, careers_url)")
        .in_("id", job_ids)
        .execute()
    )
    jobs_by_id = {j["id"]: j for j in (jobs_res.data or [])}

    # Step 3: Apply job-level filters in Python and attach job data
    filtered_matches = []
    for m in all_matches:
        job = jobs_by_id.get(m["job_id"], {})
        if not job:
            continue

        # Apply location filter
        if location and location.lower() not in (job.get("location") or "").lower():
            continue

        # Apply job_type filter
        if job_type and job.get("job_type") != job_type:
            continue

        # Apply company_id filter
        if company_id and job.get("company_id") != company_id:
            continue

        m["jobs"] = job
        filtered_matches.append(m)

    # Pagination
    offset = (page - 1) * page_size
    paginated = filtered_matches[offset: offset + page_size]

    # Remove internal job_id field from response
    for m in paginated:
        m.pop("job_id", None)

    return {
        "page": page,
        "page_size": page_size,
        "matches": paginated,
        "filters": {
            "min_score": effective_min_score,
            "days": effective_days,
        },
    }


@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    """Quick stats for dashboard header."""
    client = get_service_client()
    user_id = current_user["id"]

    settings_res = (
        client.table("user_settings")
        .select("match_threshold, job_retention_days")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    settings = settings_res.data or {}
    threshold = settings.get("match_threshold", 70)
    retention = settings.get("job_retention_days", 7)

    # Use Python datetime for cutoff (PostgREST can't evaluate SQL expressions as filter values)
    retention_cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=retention)).isoformat()
    today_cutoff = (datetime.now(tz=timezone.utc) - timedelta(days=1)).isoformat()

    all_matches = (
        client.table("job_matches")
        .select("match_score")
        .eq("user_id", user_id)
        .gte("match_score", threshold)
        .gte("created_at", retention_cutoff)
        .execute()
    )

    scores = [m["match_score"] for m in (all_matches.data or [])]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    today_matches = (
        client.table("job_matches")
        .select("id")
        .eq("user_id", user_id)
        .gte("match_score", threshold)
        .gte("created_at", today_cutoff)
        .execute()
    )

    return {
        "total_matches": len(scores),
        "today_matches": len(today_matches.data or []),
        "avg_score": avg_score,
        "threshold": threshold,
        "retention_days": retention,
        "last_updated": datetime.now(tz=timezone.utc).isoformat(),
    }
