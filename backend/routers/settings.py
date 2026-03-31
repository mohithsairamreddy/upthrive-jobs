from fastapi import APIRouter, Depends, HTTPException
from services.supabase_client import get_service_client
from routers.auth import get_current_user
from models.schemas import UserSettingsUpdate, OnboardingData
from datetime import datetime, timezone

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/")
def get_settings(current_user: dict = Depends(get_current_user)):
    client = get_service_client()
    result = (
        client.table("user_settings")
        .select("*")
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Settings not found.")
    return result.data


@router.patch("/")
def update_settings(
    payload: UserSettingsUpdate,
    current_user: dict = Depends(get_current_user),
):
    client = get_service_client()

    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    # Use Python datetime instead of SQL expression (PostgREST rejects SQL expressions as values)
    update_data["updated_at"] = datetime.now(tz=timezone.utc).isoformat()

    client.table("user_settings").update(update_data).eq("user_id", current_user["id"]).execute()
    return {"message": "Settings updated.", "updated": list(update_data.keys())}


@router.post("/onboarding")
def complete_onboarding(
    payload: OnboardingData,
    current_user: dict = Depends(get_current_user),
):
    """
    Called after signup — saves initial job preferences.
    """
    client = get_service_client()

    client.table("user_settings").update({
        "job_roles": payload.job_roles,
        "locations": payload.locations,
        "job_types": payload.job_types,
        "experience_level": payload.experience_level,
        "notification_email": str(payload.notification_email),
        # Use Python datetime instead of SQL expression
        "updated_at": datetime.now(tz=timezone.utc).isoformat(),
    }).eq("user_id", current_user["id"]).execute()

    return {"message": "Onboarding complete. Upload your resume to start matching!"}
