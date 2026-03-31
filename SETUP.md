# Upthrive Jobs — Complete Setup Guide

Everything is free-tier. No server on your PC. ~30 minutes end to end.

---

## Accounts You Need (all free)

| Service    | URL                          | Used for                     |
|------------|------------------------------|------------------------------|
| Supabase   | supabase.com                 | Database + Auth + File storage |
| Render     | render.com                   | FastAPI backend hosting       |
| Vercel     | vercel.com                   | React frontend hosting        |
| Resend     | resend.com                   | Sending emails                |
| GitHub     | github.com                   | Code repo + daily cron jobs   |

---

## Step 1 — Supabase Setup

1. Go to **supabase.com** → New project
   - Name: `upthrive-jobs`
   - Database password: generate a strong one (save it)
   - Region: **South Asia (Mumbai)** — ap-south-1

2. After project is created, go to **SQL Editor** → New query
   - Paste the entire contents of `supabase_schema.sql`
   - Click **Run** — this creates all tables, RLS policies, and seeds ~50 Indian companies

3. Go to **Storage** → Create a new bucket
   - Name: `resumes`
   - **Public bucket**: OFF (keep private)
   - Under bucket policies, add:
     ```sql
     -- Users can upload their own resumes
     CREATE POLICY "Users upload own resume"
     ON storage.objects FOR INSERT
     WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

     -- Users can read their own resumes
     CREATE POLICY "Users read own resume"
     ON storage.objects FOR SELECT
     USING (auth.uid()::text = (storage.foldername(name))[1]);

     -- Users can delete their own resumes
     CREATE POLICY "Users delete own resume"
     ON storage.objects FOR DELETE
     USING (auth.uid()::text = (storage.foldername(name))[1]);
     ```

4. Go to **Settings → API** — copy these values:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

5. Go to **Authentication → Providers** → ensure **Email** is enabled

---

## Step 2 — Resend Setup

1. Go to **resend.com** → Create account
2. Go to **Domains** → Add your domain (or use Resend's free shared domain for testing)
   - For testing without a domain: use `onboarding@resend.dev` as FROM_EMAIL
3. Go to **API Keys** → Create API key → copy it as `RESEND_API_KEY`

---

## Step 3 — Push Code to GitHub

```bash
cd upthrive-jobs
git init
git add .
git commit -m "Initial commit"
# Create a new repo on github.com named 'upthrive-jobs'
git remote add origin https://github.com/YOUR_USERNAME/upthrive-jobs.git
git push -u origin main
```

---

## Step 4 — Add GitHub Secrets (for cron jobs)

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add each of these:

| Secret name               | Value                              |
|---------------------------|------------------------------------|
| `SUPABASE_URL`            | From Step 1                        |
| `SUPABASE_ANON_KEY`       | From Step 1                        |
| `SUPABASE_SERVICE_ROLE_KEY` | From Step 1                      |
| `RESEND_API_KEY`          | From Step 2                        |
| `FROM_EMAIL`              | Your verified sender email         |
| `APP_URL`                 | Your Vercel URL (fill in Step 6)   |

---

## Step 5 — Deploy Backend on Render

1. Go to **render.com** → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root directory**: `backend`
   - **Runtime**: Python 3
   - **Build command**:
     ```
     pip install -r requirements.txt && python -m spacy download en_core_web_sm && python -m playwright install chromium --with-deps
     ```
   - **Start command**:
     ```
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance type**: Free

4. Under **Environment Variables**, add:
   ```
   SUPABASE_URL              = (from Step 1)
   SUPABASE_ANON_KEY         = (from Step 1)
   SUPABASE_SERVICE_ROLE_KEY = (from Step 1)
   RESEND_API_KEY            = (from Step 2)
   FROM_EMAIL                = (your email)
   ENVIRONMENT               = production
   APP_URL                   = (your Vercel URL — fill after Step 6)
   ALLOWED_ORIGINS           = https://your-app.vercel.app
   ```

5. Deploy. Once live, copy the URL — e.g. `https://upthrive-jobs-api.onrender.com`

> **Note**: Render free tier sleeps after 15 min inactivity. The API may take ~30s to wake
> on first request. The cron jobs run directly via GitHub Actions, so they are NOT affected.

---

## Step 6 — Deploy Frontend on Vercel

1. Go to **vercel.com** → New Project → Import your GitHub repo
2. Settings:
   - **Root directory**: `frontend`
   - **Framework**: Vite
   - **Build command**: `npm run build`
   - **Output directory**: `dist`

3. Under **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL      = (from Step 1)
   VITE_SUPABASE_ANON_KEY = (from Step 1)
   VITE_API_URL           = https://upthrive-jobs-api.onrender.com
   ```

4. Deploy. Copy your Vercel URL — e.g. `https://upthrive-jobs.vercel.app`

5. **Go back** to Render and update `APP_URL` and `ALLOWED_ORIGINS` with your Vercel URL.
6. **Go back** to GitHub Secrets and update `APP_URL` with your Vercel URL.

---

## Step 7 — Test the Cron Manually

Before waiting for the daily schedule, run it manually:

1. Go to your GitHub repo → **Actions** → **Daily Job Pipeline**
2. Click **Run workflow** → **Run workflow**
3. Watch the logs — you should see scrapers running and jobs being saved

---

## Step 8 — Test the Full App

1. Open your Vercel URL
2. Register with your email
3. Complete onboarding (select roles, locations)
4. Upload your resume (PDF or DOCX)
5. Go to Companies → enable/disable companies
6. After the cron runs → Dashboard will show matched jobs

---

## Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m playwright install chromium

# Copy and fill in env file
cp .env.example .env

uvicorn main:app --reload
# API runs at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install

# Copy and fill in env file
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000

npm run dev
# Opens at http://localhost:5173
```

### Run cron scripts locally
```bash
cd backend
python cron/scrape_jobs.py   # Step 1: scrape
python cron/match_jobs.py    # Step 2: match
python cron/send_emails.py   # Step 3: email
```

---

## Security Checklist

- [x] Supabase RLS enabled on all tables (users only see their own data)
- [x] Resume bucket is private (only owner can read/write)
- [x] JWT verified on every backend API request
- [x] Service role key never exposed to frontend
- [x] CORS restricted to your Vercel domain only
- [x] File uploads validated (type + size)
- [x] All secrets stored in env vars / GitHub Secrets (never in code)
- [x] HTTPS enforced by Vercel and Render

---

## Free Tier Limits

| Service  | Limit                         | Should be fine?       |
|----------|-------------------------------|-----------------------|
| Supabase | 500MB DB, 1GB storage         | Yes, easily           |
| Render   | 750 hrs/month, sleeps on idle | Yes (cron via GH Actions) |
| Vercel   | 100GB bandwidth/month         | Yes                   |
| Resend   | 3,000 emails/month            | Yes (1 email/user/day)|
| GitHub   | 2,000 Actions min/month       | Yes (~10 min/day)     |

---

## Troubleshooting

**Resume parse shows 0 skills**
→ Your PDF may be image-based (scanned). Use a text-based PDF. Try copying text from the PDF — if you can't select text, it's image-based.

**Cron scrapes but no matches appear**
→ Check that you've uploaded a resume. Matches are only computed for users with a parsed resume.

**Render API returns 500**
→ Check Render logs. Usually a missing env var. Ensure all 6 env vars are set.

**Email not received**
→ Check spam. Verify `FROM_EMAIL` is verified in Resend. Check Resend dashboard for delivery logs.

**Playwright scraper returns 0 jobs**
→ Some companies block scrapers entirely. Toggle them off in Companies and use the direct link instead.
