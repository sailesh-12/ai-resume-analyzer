"""
app/services/adzuna_service.py
==============================
Integration with Adzuna Jobs API to fetch relevant job listings.
Handles API calls, error handling, and job data formatting.
"""

import aiohttp
import json
from typing import Optional
from datetime import datetime
from app.core.config import settings


# Adzuna API endpoints
ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs"
ADZUNA_SEARCH_URL = f"{ADZUNA_BASE_URL}/{{location}}/search/{{page}}"

# Valid Adzuna country slugs — map common inputs to the required format
_LOCATION_MAP = {
    "us": "us", "usa": "us", "united states": "us", "america": "us",
    "gb": "gb", "uk": "gb", "united kingdom": "gb", "england": "gb", "britain": "gb",
    "au": "au", "australia": "au",
    "ca": "ca", "canada": "ca",
    "de": "de", "germany": "de",
    "fr": "fr", "france": "fr",
    "in": "in", "india": "in",
    "nl": "nl", "netherlands": "nl",
    "sg": "sg", "singapore": "sg",
    "nz": "nz", "new zealand": "nz",
    "za": "za", "south africa": "za",
    "br": "br", "brazil": "br",
    "at": "at", "austria": "at",
    "be": "be", "belgium": "be",
    "it": "it", "italy": "it",
    "pl": "pl", "poland": "pl",
    "ru": "ru", "russia": "ru",
}


def _parse_location(location_str: str) -> tuple[str, Optional[str]]:
    """
    Parses a user-provided location string into a valid Adzuna country slug
    and an optional sublocation for the 'where' parameter.
    
    Default country slug is 'us'.
    """
    if not location_str:
        return "us", None
        
    normalized = location_str.strip().lower()
    
    # Check if the entire string maps to a country slug directly
    if normalized in _LOCATION_MAP:
        return _LOCATION_MAP[normalized], None
        
    # Check if the entire string is already a valid 2-letter country code
    if len(normalized) == 2 and normalized in _LOCATION_MAP.values():
        return normalized, None

    # Common US states to prevent confusion with country codes (e.g. CA for Canada/California, IN for India/Indiana)
    us_states = {
        "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me",
        "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa",
        "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy"
    }

    # Check for common separations like "City, State/Country"
    parts = [p.strip() for p in location_str.split(",")]
    if len(parts) > 1:
        last_part = parts[-1].lower()
        
        # If the last part is a US state, it's definitely US
        if last_part in us_states:
            return "us", location_str
            
        # Check if the last part is a known country
        if last_part in _LOCATION_MAP:
            country = _LOCATION_MAP[last_part]
            sublocation = ", ".join(parts[:-1])
            return country, sublocation
            
        # Check if the last part is a 2-letter country slug
        if len(last_part) == 2 and last_part in _LOCATION_MAP.values():
            sublocation = ", ".join(parts[:-1])
            return last_part, sublocation

    # Common cities mapped to their respective countries for best user defaults
    common_uk_cities = {"london", "manchester", "birmingham", "leeds", "glasgow", "sheffield", "liverpool", "bristol", "edinburgh"}
    common_ca_cities = {"toronto", "vancouver", "montreal", "ottawa", "calgary", "edmonton"}
    common_au_cities = {"sydney", "melbourne", "brisbane", "perth", "adelaide"}
    common_in_cities = {"bangalore", "mumbai", "delhi", "hyderabad", "chennai", "pune"}
    
    if normalized in common_uk_cities:
        return "gb", location_str
    elif normalized in common_ca_cities:
        return "ca", location_str
    elif normalized in common_au_cities:
        return "au", location_str
    elif normalized in common_in_cities:
        return "in", location_str
        
    # Default to "us" country with the full location string as the sublocation
    return "us", location_str


class AdzunaAPIError(Exception):
    """Raised when Adzuna API call fails"""
    pass


async def fetch_jobs_by_skills(
    skills: list[str],
    location: str = "US",
    results_per_page: int = 50,
    page: int = 1,
    salary_min: Optional[int] = None,
    salary_max: Optional[int] = None,
) -> dict:
    """
    Fetch jobs from Adzuna matching the provided skills.
    
    Args:
        skills: List of skills to search for (e.g., ["Python", "React", "MongoDB"])
        location: Geographic location (e.g., "US", "London", "San Francisco")
        results_per_page: Number of jobs per page (max 50)
        page: Page number for pagination
        salary_min: Minimum salary filter (optional)
        salary_max: Maximum salary filter (optional)
    
    Returns:
        dict containing:
            - jobs: list of job objects with title, company, location, salary, skills_matched
            - total: total number of jobs found
            - page: current page
            - results_returned: number of results in this response
    
    Raises:
        AdzunaAPIError: If API call fails
    """
    
    if not settings.ADZUNA_API_ID or not settings.ADZUNA_API_KEY:
        raise AdzunaAPIError(
            "Adzuna API credentials not configured. "
            "Set ADZUNA_API_ID and ADZUNA_API_KEY in environment."
        )
    
    if not skills:
        raise ValueError("At least one skill must be provided")
    
    # Search using the primary skill to maximize high-quality, relevant results
    keywords = skills[0] if skills else "Software Engineer"
    
    country_slug, sublocation = _parse_location(location)
    
    params = {
        "app_id": settings.ADZUNA_API_ID,
        "app_key": settings.ADZUNA_API_KEY,
        "what": keywords,
        "results_per_page": min(results_per_page, 50),
        "sort_by": "date",  # Sort by most recent
        "sort_direction": "down",
    }
    
    if sublocation:
        params["where"] = sublocation
        
    if salary_min:
        params["salary_min"] = salary_min
    if salary_max:
        params["salary_max"] = salary_max
    
    try:
        async with aiohttp.ClientSession() as session:
            url = ADZUNA_SEARCH_URL.format(location=country_slug, page=page)
            headers = {"Accept": "application/json"}

            print(f"[Adzuna] Fetching jobs for skills: {skills} in {location} (country: {country_slug}, page: {page}, where: {sublocation})")

            async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    error_msg = await resp.text()
                    raise AdzunaAPIError(
                        f"Adzuna API returned {resp.status}: {error_msg}"
                    )
                
                data = await resp.json()
                
                # Parse and enrich response
                jobs = []
                for job in data.get("results", []):
                    enriched_job = _enrich_job_data(job, skills)
                    jobs.append(enriched_job)
                
                return {
                    "jobs": jobs,
                    "total": data.get("count", 0),
                    "page": page,
                    "results_returned": len(jobs),
                    "location": location,
                    "skills_searched": skills,
                }
    
    except aiohttp.ClientError as e:
        raise AdzunaAPIError(f"Network error connecting to Adzuna API: {str(e)}")
    except json.JSONDecodeError as e:
        raise AdzunaAPIError(f"Invalid JSON response from Adzuna API: {str(e)}")


def _enrich_job_data(job: dict, searched_skills: list[str]) -> dict:
    """
    Enrich raw Adzuna job data with additional metadata.
    
    Args:
        job: Raw job object from Adzuna API
        searched_skills: Skills that were searched for
    
    Returns:
        Enriched job object with additional fields
    """
    
    job_title = job.get("title", "").lower()
    job_description = job.get("description", "").lower()
    
    # Find which skills are mentioned in this job
    matched_skills = [
        skill for skill in searched_skills
        if skill.lower() in job_title or skill.lower() in job_description
    ]
    
    # Parse salary range
    salary_min = job.get("salary_min")
    salary_max = job.get("salary_max")
    salary_currency = job.get("salary_currency", "USD")
    
    salary_range_str = ""
    if salary_min and salary_max:
        salary_range_str = f"{salary_currency} {salary_min:,} - {salary_max:,}"
    elif salary_min:
        salary_range_str = f"{salary_currency} {salary_min:,}+"
    elif salary_max:
        salary_range_str = f"Up to {salary_currency} {salary_max:,}"
    
    # Parse posted date
    posted_date = job.get("created", "")
    try:
        posted_date_obj = datetime.fromisoformat(posted_date.replace("Z", "+00:00"))
        days_ago = (datetime.now(posted_date_obj.tzinfo) - posted_date_obj).days
        posted_relative = f"{days_ago} days ago" if days_ago > 0 else "Today"
    except:
        posted_relative = "Recently"
    
    return {
        "id": job.get("id"),
        "title": job.get("title"),
        "company": job.get("company", {}).get("display_name", "Unknown"),
        "location": {
            "display_name": job.get("location", {}).get("display_name", "Remote"),
            "area": [job.get("location", {}).get("area", [])],
        },
        "description": job.get("description", "")[:500],  # Truncate description
        "salary_min": salary_min,
        "salary_max": salary_max,
        "salary_range": salary_range_str,
        "currency": salary_currency,
        "job_type": job.get("contract_type", "Permanent"),
        "url": job.get("redirect_url"),
        "posted_date": posted_date,
        "posted_relative": posted_relative,
        "matched_skills": matched_skills,
        "skills_match_percentage": len(matched_skills) / len(searched_skills) * 100 if searched_skills else 0,
        "source": "adzuna",
    }


async def search_jobs_advanced(
    query: str,
    location: str = "US",
    results_per_page: int = 50,
) -> dict:
    """
    Advanced search using custom query string.
    
    Args:
        query: Custom search query (e.g., "senior python developer")
        location: Geographic location
        results_per_page: Number of results per page
    
    Returns:
        Search results with job listings
    """
    
    if not settings.ADZUNA_API_ID or not settings.ADZUNA_API_KEY:
        raise AdzunaAPIError("Adzuna API credentials not configured")
    
    country_slug, sublocation = _parse_location(location)
    
    params = {
        "app_id": settings.ADZUNA_API_ID,
        "app_key": settings.ADZUNA_API_KEY,
        "what": query,
        "results_per_page": min(results_per_page, 50),
        "sort_by": "date",
        "sort_direction": "down",
    }
    
    if sublocation:
        params["where"] = sublocation
        
    try:
        async with aiohttp.ClientSession() as session:
            url = ADZUNA_SEARCH_URL.format(location=country_slug, page=1)
            headers = {"Accept": "application/json"}

            async with session.get(url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    raise AdzunaAPIError(f"Adzuna API error: {resp.status}")
                
                data = await resp.json()
                
                jobs = [_enrich_job_data(job, []) for job in data.get("results", [])]
                
                return {
                    "jobs": jobs,
                    "total": data.get("count", 0),
                    "query": query,
                    "location": location,
                }
    
    except aiohttp.ClientError as e:
        raise AdzunaAPIError(f"Network error: {str(e)}")
