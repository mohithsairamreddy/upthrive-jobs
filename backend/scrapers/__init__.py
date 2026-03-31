from . import greenhouse, lever, playwright_scraper

SCRAPER_MAP = {
    "greenhouse": greenhouse.scrape,
    "lever": lever.scrape,
    "workday": playwright_scraper.scrape,   # Workday uses Playwright too
    "playwright": playwright_scraper.scrape,
    "manual": None,
}


async def scrape_company(company: dict) -> list[dict]:
    """Route a company to the correct scraper based on scrape_method."""
    method = company.get("scrape_method", "playwright")
    scraper = SCRAPER_MAP.get(method)
    if scraper is None:
        print(f"[Scraper] {company['name']}: scrape_method=manual, skipping.")
        return []
    return await scraper(company)
