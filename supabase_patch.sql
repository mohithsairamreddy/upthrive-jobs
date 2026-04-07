-- ─────────────────────────────────────────────────────────────────────────────
-- PATCH: Fix broken company scrapers + add new companies
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Fix Greenhouse 404s: these companies moved off Greenhouse, switch to playwright
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://careers.meesho.com/jobs'              WHERE name = 'Meesho';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://www.browserstack.com/careers'         WHERE name = 'BrowserStack';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://razorpay.com/jobs/'                   WHERE name = 'Razorpay';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://careers.freshworks.com/jobs'          WHERE name = 'Freshworks';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://fi.money/careers'                     WHERE name = 'Jupiter (Fi)';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://setu.co/careers'                      WHERE name = 'Setu';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://niyo.co/careers'                      WHERE name = 'Niyo';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://khatabook.com/careers'                WHERE name = 'Khatabook';

-- Fix Lever 404s: switch to playwright
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://www.chargebee.com/careers/'           WHERE name = 'Chargebee';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://clevertap.com/careers/'               WHERE name = 'CleverTap';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://darwinbox.com/careers'                WHERE name = 'Darwinbox';
UPDATE public.companies SET scrape_method = 'playwright', ats_slug = null, careers_url = 'https://licious.in/careers'                   WHERE name = 'Licious';

-- Fix bad/broken playwright URLs
UPDATE public.companies SET careers_url = 'https://www.tcs.com/careers/tcs-careers'                   WHERE name = 'TCS';
UPDATE public.companies SET careers_url = 'https://careers.hcltech.com/'                              WHERE name = 'HCL Tech';
UPDATE public.companies SET careers_url = 'https://www.persistent.com/careers/current-opportunities/' WHERE name = 'Persistent';
UPDATE public.companies SET careers_url = 'https://careers.zomato.com/'                               WHERE name = 'Zomato';

-- ─────────────────────────────────────────────────────────────────────────────
-- Add new companies (Greenhouse API — reliable)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.companies (name, careers_url, scrape_method, ats_slug) VALUES
  ('Sprinklr',         'https://www.sprinklr.com/careers/',        'greenhouse', 'sprinklr'),
  ('Hasura',           'https://hasura.io/careers/',               'greenhouse', 'hasura'),
  ('Druva',            'https://www.druva.com/about/company/careers/', 'greenhouse', 'druva'),
  ('Icertis',          'https://www.icertis.com/company/careers/', 'greenhouse', 'icertis'),
  ('Zenoti',           'https://www.zenoti.com/careers',           'greenhouse', 'zenoti')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Add new companies (Lever API — reliable)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.companies (name, careers_url, scrape_method, ats_slug) VALUES
  ('Whatfix',          'https://whatfix.com/careers/',             'lever', 'whatfix'),
  ('WebEngage',        'https://webengage.com/careers/',           'lever', 'webengage'),
  ('Uniphore',         'https://www.uniphore.com/careers/',        'lever', 'uniphore'),
  ('LeadSquared',      'https://www.leadsquared.com/careers/',     'lever', 'leadsquared'),
  ('Exotel',           'https://exotel.com/careers/',              'lever', 'exotel')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Add new companies (Playwright — well-known Indian tech companies)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.companies (name, careers_url, scrape_method, ats_slug) VALUES
  ('CRED',             'https://careers.cred.club/',               'playwright', null),
  ('BharatPe',         'https://jobs.bharatpe.com/',               'playwright', null),
  ('Navi',             'https://navi.com/careers',                 'playwright', null),
  ('smallcase',        'https://smallcase.com/careers',            'playwright', null),
  ('INDmoney',         'https://www.indmoney.com/careers',         'playwright', null),
  ('Cashfree Payments','https://www.cashfree.com/careers/',        'playwright', null),
  ('Ola Electric',     'https://www.olaelectric.com/careers',      'playwright', null),
  ('LTIMindtree',      'https://www.ltimindtree.com/careers',      'playwright', null),
  ('Hexaware',         'https://hexaware.com/careers/',            'playwright', null),
  ('KPIT Technologies','https://www.kpit.com/careers/',            'playwright', null),
  ('Coforge',          'https://www.coforge.com/careers',          'playwright', null),
  ('WNS Global',       'https://www.wns.com/careers',              'playwright', null),
  ('EXL Service',      'https://www.exlservice.com/careers',       'playwright', null),
  ('Genpact',          'https://www.genpact.com/careers',          'playwright', null),
  ('Signzy',           'https://signzy.com/careers/',              'playwright', null),
  ('Sarvam AI',        'https://www.sarvam.ai/careers',            'playwright', null),
  ('Krutrim',          'https://krutrim.com/careers',              'playwright', null),
  ('Juspay',           'https://juspay.in/careers',                'playwright', null),
  ('Vymo',             'https://getvymo.com/careers',              'playwright', null),
  ('MoEngage',         'https://www.moengage.com/careers/',        'playwright', null)
ON CONFLICT DO NOTHING;
