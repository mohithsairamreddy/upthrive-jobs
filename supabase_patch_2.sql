-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH 2: JD quality score column + data-focused companies
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Add jd_quality_score column to jobs table (0.0 = vague, 1.0 = high quality)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS jd_quality_score FLOAT DEFAULT NULL;

-- Index for filtering low-quality JDs efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_jd_quality ON public.jobs (jd_quality_score);

-- ─────────────────────────────────────────────────────────────────────────────
-- Data & Analytics companies (India)
-- Mix of analytics consultancies, ML product companies, data platforms
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.companies (name, careers_url, scrape_method, ats_slug) VALUES

  -- ── Pure-play analytics firms ──────────────────────────────────────────────
  ('LatentView Analytics',   'https://www.latentview.com/careers/',              'playwright', null),
  ('Mu Sigma',               'https://www.mu-sigma.com/careers',                 'playwright', null),
  ('Fractal Analytics',      'https://fractal.ai/careers/',                      'greenhouse', 'fractalanalytics'),
  ('Tiger Analytics',        'https://www.tigeranalytics.com/careers/',          'playwright', null),
  ('Tredence',               'https://www.tredence.com/careers',                 'playwright', null),
  ('TheMathCompany',         'https://themathcompany.com/careers',               'playwright', null),
  ('Sigmoid',                'https://www.sigmoid.com/careers/',                 'lever',      'sigmoid'),
  ('Quantiphi',              'https://quantiphi.com/careers/',                   'greenhouse', 'quantiphi'),
  ('Saama Technologies',     'https://saama.com/careers/',                       'playwright', null),
  ('Course5 Intelligence',   'https://www.course5i.com/careers/',                'playwright', null),
  ('Axtria',                 'https://www.axtria.com/careers/',                  'playwright', null),
  ('Bridgei2i',              'https://bridgei2i.com/careers/',                   'playwright', null),
  ('DataWeave',              'https://dataweave.com/careers',                    'playwright', null),
  ('Absolutdata',            'https://absolutdata.com/careers/',                 'playwright', null),
  ('ZS Associates',          'https://www.zs.com/careers',                       'playwright', null),

  -- ── AI / NLP / ML product companies ───────────────────────────────────────
  ('Arya.ai',                'https://arya.ai/careers',                          'playwright', null),
  ('Hyperverge',             'https://hyperverge.co/careers/',                   'lever',      'hyperverge'),
  ('Yellow.ai',              'https://yellow.ai/careers/',                       'greenhouse', 'yellowmessenger'),
  ('Observe.AI',             'https://www.observe.ai/careers',                   'greenhouse', 'observeai'),
  ('Skit.ai',                'https://skit.ai/careers',                          'greenhouse', 'skit-ai'),
  ('Vernacular.ai',          'https://vernacular.ai/careers',                    'playwright', null),
  ('Mihup',                  'https://www.mihup.com/careers',                    'playwright', null),
  ('Scry AI',                'https://scry.ai/careers',                          'playwright', null),

  -- ── Data infrastructure & analytics SaaS ──────────────────────────────────
  ('Netcore Cloud',          'https://netcorecloud.com/careers/',                'playwright', null),
  ('RudderStack',            'https://rudderstack.com/careers/',                 'greenhouse', 'rudderstack'),
  ('Clarisights',            'https://clarisights.com/careers',                  'greenhouse', 'clarisights'),
  ('Heckyl Technologies',    'https://heckyl.com/careers',                       'playwright', null),
  ('Dunnhumby India',        'https://www.dunnhumby.com/careers/',               'playwright', null)

ON CONFLICT DO NOTHING;
