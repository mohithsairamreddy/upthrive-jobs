from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID


class UserSettingsUpdate(BaseModel):
    match_threshold: Optional[int] = None
    email_frequency: Optional[str] = None
    notification_email: Optional[EmailStr] = None
    locations: Optional[list[str]] = None
    job_types: Optional[list[str]] = None
    experience_level: Optional[str] = None
    job_roles: Optional[list[str]] = None
    job_retention_days: Optional[int] = None

    @field_validator("match_threshold")
    @classmethod
    def threshold_range(cls, v):
        if v is not None and not (10 <= v <= 99):
            raise ValueError("match_threshold must be between 10 and 99")
        return v

    @field_validator("job_retention_days")
    @classmethod
    def retention_range(cls, v):
        if v is not None and not (1 <= v <= 30):
            raise ValueError("job_retention_days must be between 1 and 30")
        return v

    @field_validator("email_frequency")
    @classmethod
    def valid_frequency(cls, v):
        if v is not None and v not in ("daily", "weekly", "never"):
            raise ValueError("email_frequency must be daily, weekly, or never")
        return v


class OnboardingData(BaseModel):
    job_roles: list[str]
    locations: list[str]
    job_types: list[str]
    experience_level: str
    notification_email: EmailStr


class CompanyCreate(BaseModel):
    name: str
    careers_url: str
    scrape_method: str = "playwright"
    ats_slug: Optional[str] = None

    @field_validator("scrape_method")
    @classmethod
    def valid_method(cls, v):
        allowed = ("greenhouse", "lever", "workday", "playwright", "manual")
        if v not in allowed:
            raise ValueError(f"scrape_method must be one of {allowed}")
        return v


class UserCompanyToggle(BaseModel):
    company_id: str
    is_enabled: bool


class JobFilters(BaseModel):
    min_score: Optional[int] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    company_id: Optional[str] = None
    days: Optional[int] = None    # show matches from last N days (respects user retention)
