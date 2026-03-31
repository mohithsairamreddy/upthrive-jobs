"""
Email Service — Resend
Sends daily job match digest emails.
"""
import os
import resend
from datetime import date

resend.api_key = os.environ.get("RESEND_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "jobs@yourdomain.com")
APP_URL = os.environ.get("APP_URL", "https://your-app.vercel.app")


def _score_color(score: float) -> str:
    if score >= 85:
        return "#16a34a"   # green
    if score >= 70:
        return "#2563eb"   # blue
    return "#d97706"       # amber


def _build_job_row(job: dict, match: dict) -> str:
    score = match["match_score"]
    color = _score_color(score)
    keywords = ", ".join(match.get("matched_keywords", [])[:8])
    return f"""
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:14px 8px;">
        <div style="font-weight:600;color:#111827;">{job['title']}</div>
        <div style="font-size:13px;color:#6b7280;">{job.get('company_name','')}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">{job.get('location','Remote')}</div>
      </td>
      <td style="padding:14px 8px;text-align:center;">
        <span style="background:{color};color:white;padding:4px 10px;border-radius:12px;font-weight:700;font-size:14px;">
          {score}%
        </span>
      </td>
      <td style="padding:14px 8px;font-size:12px;color:#6b7280;max-width:200px;">
        {keywords}
      </td>
      <td style="padding:14px 8px;text-align:center;">
        <a href="{job['apply_url']}"
           style="background:#2563eb;color:white;padding:6px 14px;border-radius:6px;
                  text-decoration:none;font-size:13px;font-weight:500;">
          Apply
        </a>
      </td>
    </tr>
    """


def build_email_html(user_name: str, matches_with_jobs: list[dict], threshold: int) -> str:
    today = date.today().strftime("%B %d, %Y")
    rows = "".join(_build_job_row(item["job"], item["match"]) for item in matches_with_jobs)
    count = len(matches_with_jobs)

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;">
      <h1 style="margin:0;color:white;font-size:24px;">Your Daily Job Matches</h1>
      <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">{today}</p>
    </div>

    <!-- Summary -->
    <div style="padding:24px 40px;background:#eff6ff;border-bottom:1px solid #dbeafe;">
      <p style="margin:0;color:#1e40af;font-size:15px;">
        Hi {user_name}, we found <strong>{count} job{'s' if count != 1 else ''}</strong>
        matching your resume above <strong>{threshold}%</strong> today.
      </p>
    </div>

    <!-- Table -->
    <div style="padding:24px 40px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Job</th>
            <th style="padding:10px 8px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Match</th>
            <th style="padding:10px 8px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Skills Matched</th>
            <th style="padding:10px 8px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <a href="{APP_URL}/dashboard"
         style="display:inline-block;background:#1e40af;color:white;padding:10px 28px;
                border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        View All Matches →
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
        You're receiving this because you set up job alerts on Upthrive Jobs.<br>
        <a href="{APP_URL}/settings" style="color:#6b7280;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
    """


def send_daily_digest(
    to_email: str,
    user_name: str,
    matches_with_jobs: list[dict],
    threshold: int,
) -> bool:
    """
    Send daily job digest email.
    matches_with_jobs: [{"job": {...}, "match": {"match_score": 80, "matched_keywords": [...]}}]
    Returns True on success.
    """
    if not matches_with_jobs:
        return False

    html = build_email_html(user_name, matches_with_jobs, threshold)
    count = len(matches_with_jobs)

    try:
        resend.Emails.send({
            "from": f"Upthrive Jobs <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": f"🎯 {count} new job match{'es' if count != 1 else ''} today ({date.today().strftime('%b %d')})",
            "html": html,
        })
        return True
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
        return False
