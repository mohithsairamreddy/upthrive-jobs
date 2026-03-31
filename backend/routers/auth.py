"""
Auth Router
Login/signup are handled directly by Supabase JS on the frontend.
This router provides server-side token verification and user info.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from services.supabase_client import get_service_client
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency: verify Supabase JWT and return user payload."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        client = get_service_client()
        user = client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user.user.id, "email": user.user.email, "token": token}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Return current authenticated user's info."""
    return {"id": current_user["id"], "email": current_user["email"]}
