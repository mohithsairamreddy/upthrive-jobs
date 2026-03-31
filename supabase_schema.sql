-- ============================================================
-- Upthrive Jobs — Supabase Schema
-- Run this in Supabase SQL Editor after creating your project
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- USER SETTINGS
-- ─────────────────────────────────────────────
create table public.user_settings (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid references auth.users(id) on delete cascade not null unique,
  match_threshold    integer default 70 check (match_threshold between 10 and 99),
  email_frequency    text default 'daily' check (email_frequency in ('daily', 'weekly', 'never')),
  notification_email text,
  locations          text[] default '{}',
  job_types          text[] default '{}',
  experience_level   text default 'any',
  job_roles          text[] default '{}',         -- e.g. ["Software Engineer", "Data Scientist"]
  job_retention_days integer default 7 check (job_retention_days between 1 and 30),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- RESUMES
-- ─────────────────────────────────────────────
create table public.resumes (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  file_url         text not null,
  file_name        text,
  parsed_skills    text[] default '{}',
  parsed_text      text,
  job_titles       text[] default '{}',
  education        text,
  experience_years float,
  keywords         text[] default '{}',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.resumes enable row level security;

create policy "Users manage own resume"
  on public.resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- COMPANIES (global list, seeded by admin)
-- ─────────────────────────────────────────────
create table public.companies (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  careers_url    text,
  scrape_method  text default 'playwright' check (scrape_method in ('greenhouse', 'lever', 'workday', 'playwright', 'manual')),
  ats_slug       text,                          -- slug for Greenhouse/Lever APIs
  logo_url       text,
  country        text default 'India',
  is_active      boolean default true,
  last_scraped   timestamptz,
  created_at     timestamptz default now()
);

-- Public read for company list, only service_role can write
alter table public.companies enable row level security;

create policy "Anyone can read companies"
  on public.companies for select using (true);

-- ─────────────────────────────────────────────
-- USER COMPANIES (per-user enable/disable)
-- ─────────────────────────────────────────────
create table public.user_companies (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  is_enabled boolean default true,
  unique (user_id, company_id)
);

alter table public.user_companies enable row level security;

create policy "Users manage own company list"
  on public.user_companies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- JOBS (global, shared across users)
-- ─────────────────────────────────────────────
create table public.jobs (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid references public.companies(id) on delete cascade,
  title        text not null,
  description  text,
  location     text,
  job_type     text,
  apply_url    text,
  posted_at    timestamptz,
  scraped_at   timestamptz default now(),
  unique (company_id, apply_url)
);

alter table public.jobs enable row level security;

create policy "Anyone can read jobs"
  on public.jobs for select using (true);

-- Auto-cleanup jobs older than 30 days (run via cron)
-- DELETE FROM public.jobs WHERE expires_at < now();

-- ─────────────────────────────────────────────
-- JOB MATCHES (per user)
-- ─────────────────────────────────────────────
create table public.job_matches (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  job_id           uuid references public.jobs(id) on delete cascade not null,
  match_score      float not null,
  matched_keywords text[] default '{}',
  sent_in_email    boolean default false,
  created_at       timestamptz default now(),
  unique (user_id, job_id)
);

alter table public.job_matches enable row level security;

create policy "Users see own matches"
  on public.job_matches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- SEED: INDIAN COMPANIES
-- ─────────────────────────────────────────────
insert into public.companies (name, careers_url, scrape_method, ats_slug) values
  -- Greenhouse API (public, no auth needed)
  ('Razorpay',        'https://razorpay.com/jobs/',            'greenhouse', 'razorpay'),
  ('Meesho',          'https://meesho.io/jobs',                'greenhouse', 'meesho'),
  ('BrowserStack',    'https://www.browserstack.com/careers',  'greenhouse', 'browserstack'),
  ('Freshworks',      'https://www.freshworks.com/company/careers/', 'greenhouse', 'freshworks'),
  ('Postman',         'https://www.postman.com/company/careers/', 'greenhouse', 'postman'),
  ('Jupiter (Fi)',    'https://fi.money/careers',              'greenhouse', 'epifi'),
  ('Setu',            'https://setu.co/careers',               'greenhouse', 'setu'),
  ('Niyo',            'https://niyo.co/careers',               'greenhouse', 'niyo'),
  ('Slice',           'https://sliceit.com/careers',           'greenhouse', 'slice'),
  ('Khatabook',       'https://khatabook.com/careers',         'greenhouse', 'khatabook'),
  -- Lever API (public JSON endpoint)
  ('Chargebee',       'https://www.chargebee.com/careers/',    'lever', 'chargebee'),
  ('CleverTap',       'https://clevertap.com/careers/',        'lever', 'clevertap'),
  ('MindTickle',      'https://www.mindtickle.com/careers/',   'lever', 'mindtickle'),
  ('Darwinbox',       'https://darwinbox.com/careers',         'lever', 'darwinbox'),
  ('Unacademy',       'https://unacademy.com/careers',         'lever', 'unacademy'),
  ('Licious',         'https://licious.in/careers',            'lever', 'licious'),
  -- Workday (complex, Playwright)
  ('Infosys',         'https://career.infosys.com/',           'playwright', null),
  ('Wipro',           'https://careers.wipro.com/',            'playwright', null),
  ('Accenture India', 'https://www.accenture.com/in-en/careers', 'playwright', null),
  ('IBM India',       'https://www.ibm.com/in-en/employment/', 'playwright', null),
  ('Capgemini',       'https://www.capgemini.com/in-en/careers/', 'playwright', null),
  ('Cognizant',       'https://careers.cognizant.com/',        'playwright', null),
  -- Custom portals (Playwright)
  ('Flipkart',        'https://www.flipkartcareers.com/',      'playwright', null),
  ('Swiggy',          'https://careers.swiggy.com/',           'playwright', null),
  ('Zomato',          'https://www.zomato.com/careers',        'playwright', null),
  ('Ola',             'https://ola.careers/',                  'playwright', null),
  ('PhonePe',         'https://careers.phonepe.com/',          'playwright', null),
  ('Paytm',           'https://paytm.com/about-us/careers/',   'playwright', null),
  ('Groww',           'https://groww.in/careers',              'playwright', null),
  ('Zerodha',         'https://zerodha.com/careers/',          'playwright', null),
  ('Dream11',         'https://www.dream11.com/careers',       'playwright', null),
  ('Nykaa',           'https://careers.nykaa.com/',            'playwright', null),
  ('ShareChat',       'https://sharechat.com/careers',         'playwright', null),
  ('Urban Company',   'https://www.urbancompany.com/careers/', 'playwright', null),
  ('Lenskart',        'https://careers.lenskart.com/',         'playwright', null),
  ('Delhivery',       'https://www.delhivery.com/careers',     'playwright', null),
  ('HDFC Bank',       'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?folderName=About-Us&fileName=Career.html', 'playwright', null),
  ('ICICI Bank',      'https://www.icicicareers.com/',         'playwright', null),
  ('Bajaj Finserv',   'https://www.bajajfinserv.in/careers',   'playwright', null),
  ('TCS',             'https://ibegin.tcs.com/iBegin/',        'playwright', null),
  ('HCL Tech',        'https://www.hcltech.com/careers',       'playwright', null),
  ('Tech Mahindra',   'https://careers.techmahindra.com/',     'playwright', null),
  ('Persistent',      'https://careers.persistent.com/',       'playwright', null),
  ('Mphasis',         'https://careers.mphasis.com/',          'playwright', null),
  -- MNCs with India offices
  ('Google India',    'https://careers.google.com/jobs/results/?location=India', 'playwright', null),
  ('Microsoft India', 'https://careers.microsoft.com/us/en/search-results?keywords=&location=India', 'playwright', null),
  ('Amazon India',    'https://www.amazon.jobs/en/locations/india', 'playwright', null),
  ('Adobe India',     'https://careers.adobe.com/us/en/india-jobs', 'playwright', null),
  ('Salesforce India','https://salesforce.wd12.myworkdayjobs.com/Careers', 'playwright', null)
on conflict do nothing;

-- ─────────────────────────────────────────────
-- HELPER: Auto-create settings on user signup
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_settings (user_id, notification_email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
