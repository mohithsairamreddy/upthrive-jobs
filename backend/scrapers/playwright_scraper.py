"""
Playwright Stealth Scraper
Fallback for companies with custom career portals or Workday/SAP systems.
Anti-detection: random delays, realistic headers, stealth JS patches.
"""
import re
import asyncio
import random
from datetime import datetime, timezone
from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout


# Realistic browser headers to avoid bot detection
STEALTH_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en-GB;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

# JS to patch common bot-detection checks
STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-GB', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
window.chrome = { runtime: {} };
"""


def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


async def _human_delay(min_ms: int = 1500, max_ms: int = 4000):
    await asyncio.sleep(random.randint(min_ms, max_ms) / 1000)


async def _setup_page(page: Page, ua: str):
    await page.set_extra_http_headers(STEALTH_HEADERS)
    await page.add_init_script(STEALTH_JS)
    await page.evaluate(f"() => {{ Object.defineProperty(navigator, 'userAgent', {{ get: () => '{ua}' }}); }}")


# ── Generic career page scraper ───────────────────────────────────────────────

GENERIC_JOB_SELECTORS = [
    # Common patterns across career portals
    "a[href*='/job/']",
    "a[href*='/jobs/']",
    "a[href*='/career/']",
    "a[href*='/careers/']",
    "a[href*='job-detail']",
    "a[href*='jobdetail']",
    "[data-job-id]",
    ".job-listing a",
    ".career-listing a",
    ".opening a",
    ".position a",
]


async def _extract_jobs_from_page(page: Page, company: dict, base_url: str) -> list[dict]:
    """Try multiple selectors to find job links on a careers page."""
    jobs = []

    for selector in GENERIC_JOB_SELECTORS:
        try:
            elements = await page.query_selector_all(selector)
            if elements:
                for el in elements[:50]:  # max 50 jobs per company
                    try:
                        href = await el.get_attribute("href") or ""
                        title = (await el.inner_text()).strip()
                        if not title or len(title) < 3:
                            continue
                        # Make absolute URL
                        if href.startswith("/"):
                            from urllib.parse import urlparse
                            parsed = urlparse(base_url)
                            href = f"{parsed.scheme}://{parsed.netloc}{href}"
                        elif not href.startswith("http"):
                            href = base_url.rstrip("/") + "/" + href

                        if href and title:
                            jobs.append({
                                "company_id": company["id"],
                                "title": title[:200],
                                "description": f"Apply at {href}",
                                "location": "India",
                                "job_type": "Full-time",
                                "apply_url": href,
                                "posted_at": datetime.now(tz=timezone.utc).isoformat(),
                            })
                    except Exception:
                        continue
                if jobs:
                    break
        except Exception:
            continue

    return jobs


async def scrape(company: dict) -> list[dict]:
    """
    Scrape career page using Playwright with stealth techniques.
    Returns list of job dicts (title + apply URL at minimum).
    """
    careers_url = company.get("careers_url")
    if not careers_url:
        print(f"[Playwright] No URL for {company['name']}, skipping.")
        return []

    ua = random.choice(USER_AGENTS)
    jobs = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
        context = await browser.new_context(
            user_agent=ua,
            viewport={"width": 1366, "height": 768},
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )
        page = await context.new_page()
        await _setup_page(page, ua)

        try:
            await page.goto(careers_url, wait_until="domcontentloaded", timeout=30000)
            await _human_delay(2000, 4000)

            # Scroll to trigger lazy loading
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
            await _human_delay(1000, 2000)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await _human_delay(1000, 2000)

            jobs = await _extract_jobs_from_page(page, company, careers_url)

            # If no jobs found via links, try to get text-based listing
            if not jobs:
                print(f"[Playwright] {company['name']}: No job links found via selectors, marking as manual.")
                jobs = [{
                    "company_id": company["id"],
                    "title": f"See open roles at {company['name']}",
                    "description": "Visit careers page directly.",
                    "location": "India",
                    "job_type": "Various",
                    "apply_url": careers_url,
                    "posted_at": datetime.now(tz=timezone.utc).isoformat(),
                }]

        except PWTimeout:
            print(f"[Playwright] {company['name']}: Timeout loading {careers_url}")
        except Exception as e:
            print(f"[Playwright] {company['name']}: Error — {e}")
        finally:
            await browser.close()

    # Rate-limit: wait between companies
    await _human_delay(3000, 6000)

    print(f"[Playwright] {company['name']}: {len(jobs)} jobs found")
    return jobs
