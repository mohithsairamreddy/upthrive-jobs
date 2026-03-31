from fastapi import APIRouter, Depends, Query
from services.supabase_client import get_authed_client
from routers.auth import get_current_user
from typing import Optional

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
    client = get_authed_client(current_user["token"])
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

    # Build query — join job_matches → jobs → companies
    query = (
        client.table("job_matches")
        .select(
            "id, match_score, matched_keywords, created_at, sent_in_email,"
            "jobs(id, title, description, location, job_type, apply_url, posted_at, scraped_at,"
            "companies(id, name, logo_url, careers_url))"
        )
        .eq("user_id", user_id)
        .gte("match_score", effective_min_score)
        .gte("created_at", f"now() - interval '{effective_days} days'")
        .order("match_score", desc=True)
    )

    if location:
        query = query.ilike("jobs.location", f"%{location}%")
    if job_type:
        query = query.eq("jobs.job_type", job_type)
    if company_id:
        query = query.eq("jobs.company_id", company_id)

    # Pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    result = query.execute()

    return {
        "page": page,
        "page_size": page_size,
        "matches": result.data or [],
        "filters": {
            "min_score": effective_min_score,
            "days": effective_days,
        },
    }


@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    """Quick stats for dashboard header."""
    client = get_authed_client(current_user["token"])
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

    all_matches = (
        client.table("job_matches")
        .select("match_score")
        .eq("user_id", user_id)
        .gte("match_score", threshold)
        .gte("created_at", f"now() - interval '{retention} days'")
        .execute()
    )

    scores = [m["match_score"] for m in (all_matches.data or [])]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    today_matches = (
        client.table("job_matches")
        .select("id")
        .eq("user_id", user_id)
        .gte("match_score", threshold)
        .gte("created_at", "now() - interval '1 day'")
        .execute()
    )

    return {
        "total_matches": len(scores),
        "today_matches": len(today_matches.data or []),
        "avg_score": avg_score,
        "threshold": threshold,
        "retention_days": retention,
    }
