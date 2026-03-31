from fastapi import APIRouter, Depends, HTTPException
from services.supabase_client import get_service_client
from routers.auth import get_current_user
from models.schemas import CompanyCreate, UserCompanyToggle

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/")
def list_companies(current_user: dict = Depends(get_current_user)):
    """
    Return all companies with the user's enabled/disabled status merged in.
    """
    client = get_service_client()
    user_id = current_user["id"]

    # Fetch all global companies
    companies_res = client.table("companies").select("*").order("name").execute()
    companies = companies_res.data or []

    # Fetch user's overrides
    user_prefs_res = (
        client.table("user_companies")
        .select("company_id, is_enabled")
        .eq("user_id", user_id)
        .execute()
    )
    prefs = {row["company_id"]: row["is_enabled"] for row in (user_prefs_res.data or [])}

    # Merge: default = enabled for all companies
    for c in companies:
        c["is_enabled"] = prefs.get(c["id"], True)

    return companies


@router.post("/toggle")
def toggle_company(
    payload: UserCompanyToggle,
    current_user: dict = Depends(get_current_user),
):
    """Enable or disable a company for the current user."""
    client = get_service_client()
    user_id = current_user["id"]

    # Upsert user_companies row
    client.table("user_companies").upsert(
        {
            "user_id": user_id,
            "company_id": payload.company_id,
            "is_enabled": payload.is_enabled,
        },
        on_conflict="user_id,company_id",
    ).execute()

    return {"message": "Updated.", "is_enabled": payload.is_enabled}


@router.post("/add")
def add_company(
    payload: CompanyCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Any logged-in user can suggest a new company.
    It's added globally (service role) and auto-enabled for the requester.
    """
    svc = get_service_client()

    # Check if company URL already exists
    existing = svc.table("companies").select("id").eq("careers_url", payload.careers_url).execute()
    if existing.data:
        company_id = existing.data[0]["id"]
    else:
        result = svc.table("companies").insert({
            "name": payload.name,
            "careers_url": payload.careers_url,
            "scrape_method": payload.scrape_method,
            "ats_slug": payload.ats_slug,
            "country": "India",
        }).execute()
        company_id = result.data[0]["id"]

    # Auto-enable for this user
    svc.table("user_companies").upsert(
        {"user_id": current_user["id"], "company_id": company_id, "is_enabled": True},
        on_conflict="user_id,company_id",
    ).execute()

    return {"message": "Company added.", "company_id": company_id}


@router.delete("/{company_id}/remove")
def remove_company_for_user(
    company_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Permanently remove a company from user's list (sets disabled + won't appear)."""
    client = get_service_client()
    client.table("user_companies").upsert(
        {"user_id": current_user["id"], "company_id": company_id, "is_enabled": False},
        on_conflict="user_id,company_id",
    ).execute()
    return {"message": "Company removed from your list."}
