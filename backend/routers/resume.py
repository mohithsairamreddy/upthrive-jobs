from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from services.supabase_client import get_authed_client
from services.ats_parser import parse_resume
from routers.auth import get_current_user
import uuid

router = APIRouter(prefix="/resume", tags=["resume"])

ALLOWED_TYPES = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MAX_SIZE_MB = 5


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are accepted.")

    content = await file.read()

    # Validate size
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_SIZE_MB}MB limit.")

    # Parse resume
    try:
        parsed = parse_resume(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    client = get_authed_client(current_user["token"])
    user_id = current_user["id"]

    # Upload to Supabase Storage
    storage_path = f"{user_id}/resume_{uuid.uuid4().hex[:8]}_{file.filename}"
    try:
        client.storage.from_("resumes").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )
        file_url = client.storage.from_("resumes").get_public_url(storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    # Upsert parsed data into DB (one resume per user)
    resume_data = {
        "user_id": user_id,
        "file_url": file_url,
        "file_name": file.filename,
        **parsed,
    }

    existing = client.table("resumes").select("id").eq("user_id", user_id).execute()
    if existing.data:
        client.table("resumes").update(resume_data).eq("user_id", user_id).execute()
    else:
        client.table("resumes").insert(resume_data).execute()

    return {
        "message": "Resume uploaded and parsed successfully.",
        "skills_found": len(parsed["parsed_skills"]),
        "skills": parsed["parsed_skills"][:20],
        "job_titles": parsed["job_titles"],
        "education": parsed["education"],
        "experience_years": parsed["experience_years"],
    }


@router.get("/")
def get_resume(current_user: dict = Depends(get_current_user)):
    client = get_authed_client(current_user["token"])
    result = (
        client.table("resumes")
        .select("id, file_name, file_url, parsed_skills, job_titles, education, experience_years, updated_at")
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No resume found. Please upload one.")
    return result.data[0]


@router.delete("/")
def delete_resume(current_user: dict = Depends(get_current_user)):
    client = get_authed_client(current_user["token"])
    client.table("resumes").delete().eq("user_id", current_user["id"]).execute()
    return {"message": "Resume deleted."}
