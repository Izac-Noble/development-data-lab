import os
import re
import threading
import time
from datetime import datetime, timezone
from typing import Any

from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Secrets live in dashboard-backend/.env (git-ignored), never in the frontend bundle.
load_dotenv(Path(__file__).resolve().parent / ".env")

APP_TITLE = "Development Data Lab API"
REST_COUNTRIES_API_KEY = os.getenv("REST_COUNTRIES_API_KEY", "").strip()
REST_COUNTRIES_FIELDS = (
    "codes.alpha_3,names.common,names.official,capitals,subregion,population,area,"
    "currencies,languages,flag.emoji,landlocked,borders"
)
DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000"
REQUEST_TIMEOUT_SECONDS = 30  # World Bank can take 20+ seconds on a slow day.
UPSTREAM_RETRY_DELAYS_SECONDS = (0.4, 1.2)
RETRYABLE_STATUSES = {429, 502, 503, 504}
UPSTREAM_CACHE_TTL_SECONDS = 60 * 60
UPSTREAM_CACHE_MAX_ENTRIES = 512

# One pooled session keeps TLS connections to upstream APIs alive between requests.
HTTP_SESSION = requests.Session()
_upstream_cache: dict[str, tuple[float, Any]] = {}
_upstream_cache_lock = threading.Lock()
COUNTRY_CODE_PATTERN = re.compile(r"[A-Za-z]{3}")

WORLD_BANK_INDICATORS = {
    "SP.POP.TOTL": {
        "name": "Population, total",
        "shortName": "Population",
        "unit": "people",
        "source": "World Bank WDI",
        "description": "Total population based on the de facto definition of population.",
        "sourceUrl": "https://data.worldbank.org/indicator/SP.POP.TOTL",
    },
    "NY.GDP.PCAP.CD": {
        "name": "GDP per capita",
        "shortName": "GDP per capita",
        "unit": "current US$",
        "source": "World Bank WDI",
        "description": "Gross domestic product divided by midyear population.",
        "sourceUrl": "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD",
    },
    "SP.DYN.LE00.IN": {
        "name": "Life expectancy at birth",
        "shortName": "Life expectancy",
        "unit": "years",
        "source": "World Bank WDI",
        "description": "Number of years a newborn infant would live if mortality patterns stayed constant.",
        "sourceUrl": "https://data.worldbank.org/indicator/SP.DYN.LE00.IN",
    },
    "SE.PRM.ENRR": {
        "name": "School enrollment, primary",
        "shortName": "Primary enrollment",
        "unit": "% gross",
        "source": "World Bank WDI",
        "description": "Gross enrollment ratio for primary education.",
        "sourceUrl": "https://data.worldbank.org/indicator/SE.PRM.ENRR",
    },
    "SH.XPD.CHEX.PC.CD": {
        "name": "Health expenditure per capita",
        "shortName": "Health spend",
        "unit": "current US$",
        "source": "World Bank WDI",
        "description": "Current health expenditure per person.",
        "sourceUrl": "https://data.worldbank.org/indicator/SH.XPD.CHEX.PC.CD",
    },
}

WHO_INDICATORS = {
    "WHOSIS_000001": {
        "name": "Life expectancy at birth",
        "shortName": "Life expectancy",
        "unit": "years",
        "source": "WHO Global Health Observatory",
        "description": "Life expectancy estimates by country.",
        "sourceUrl": "https://www.who.int/data/gho",
    }
}

COUNTRY_FALLBACKS = {
    "UGA": {
        "code": "UGA",
        "name": "Uganda",
        "officialName": "Republic of Uganda",
        "flag": "🇺🇬",
        "region": "Sub-Saharan Africa",
        "incomeGroup": "Low income",
        "capital": "Kampala",
        "currency": "Ugandan shilling",
        "latitude": 1.3733,
        "longitude": 32.2903,
    },
    "KEN": {
        "code": "KEN",
        "name": "Kenya",
        "officialName": "Republic of Kenya",
        "flag": "🇰🇪",
        "region": "Sub-Saharan Africa",
        "incomeGroup": "Lower middle income",
        "capital": "Nairobi",
        "currency": "Kenyan shilling",
        "latitude": -0.0236,
        "longitude": 37.9062,
    },
    "TZA": {
        "code": "TZA",
        "name": "Tanzania",
        "officialName": "United Republic of Tanzania",
        "flag": "🇹🇿",
        "region": "Sub-Saharan Africa",
        "incomeGroup": "Lower middle income",
        "capital": "Dodoma",
        "currency": "Tanzanian shilling",
        "latitude": -6.369,
        "longitude": 34.8888,
    },
    "RWA": {
        "code": "RWA",
        "name": "Rwanda",
        "officialName": "Republic of Rwanda",
        "flag": "🇷🇼",
        "region": "Sub-Saharan Africa",
        "incomeGroup": "Low income",
        "capital": "Kigali",
        "currency": "Rwandan franc",
        "latitude": -1.9403,
        "longitude": 29.8739,
    },
}

app = FastAPI(title=APP_TITLE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": APP_TITLE, "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": now_iso()}


@app.get("/api/sources/status")
async def source_status():
    return [
        source_status_item("world-bank", "World Bank WDI", "Development indicators", "success", "Live API"),
        source_status_item("world-bank-countries", "World Bank countries", "Region, income group, capital", "success", "Live API"),
        source_status_item(
            "rest-countries",
            "REST Countries",
            "Languages, currency, area, borders (v5, API key)",
            "success" if REST_COUNTRIES_API_KEY else "inactive",
            "Backend API" if REST_COUNTRIES_API_KEY else "Set REST_COUNTRIES_API_KEY",
        ),
        source_status_item("who", "WHO GHO", "Health indicators (proxied: WHO blocks browser requests)", "success", "Backend API"),
    ]


@app.get("/api/countries/{country_code}")
def country(country_code: str):
    """Bundled profile, overlaid with live World Bank classification and, when an API key is
    configured, REST Countries v5 facts (languages, currency, area, population, borders)."""
    code = validate_country_code(country_code)
    profile = dict(fallback_country(code))
    sources = ["bundled"] if code in COUNTRY_FALLBACKS else []

    try:
        payload = fetch_json(f"https://api.worldbank.org/v2/country/{code}?format=json")
        rows = payload[1] if isinstance(payload, list) and len(payload) > 1 and isinstance(payload[1], list) else []
        if rows:
            profile = normalize_country(code, rows[0])
            sources.append("world-bank")
    except HTTPException:
        pass  # Keep the bundled profile.

    rest_status = "not-configured"
    if REST_COUNTRIES_API_KEY:
        try:
            payload = fetch_json(
                f"https://api.restcountries.com/countries/v5/codes.alpha_3/{code}"
                f"?response_fields={REST_COUNTRIES_FIELDS}",
                headers={"Authorization": f"Bearer {REST_COUNTRIES_API_KEY}"},
            )
            objects = ((payload or {}).get("data") or {}).get("objects") or []
            # Only trust a record for the requested country (the demo key, for one, returns a
            # fixed sample country regardless of the query).
            objects = [o for o in objects if ((o.get("codes") or {}).get("alpha_3") or "").upper() == code]
            if objects:
                profile = overlay_rest_countries(profile, objects[0])
                sources.append("rest-countries")
                rest_status = "success"
            else:
                rest_status = "no-data"
        except HTTPException:
            rest_status = "error"

    if not sources:
        raise HTTPException(status_code=404, detail="Country metadata is not available")

    return {**profile, "metadataSources": sources, "restCountriesStatus": rest_status}


@app.get("/api/world-bank/{country_code}/{indicator_id}")
def world_bank(
    country_code: str,
    indicator_id: str,
    start_year: int = Query(1960, ge=1960, le=2100),
    end_year: int = Query(default_factory=lambda: datetime.now(timezone.utc).year, ge=1960, le=2100),
):
    code = validate_country_code(country_code)
    indicator = WORLD_BANK_INDICATORS.get(indicator_id)
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator is not allowlisted")
    if start_year > end_year:
        raise HTTPException(status_code=400, detail="start_year must be less than or equal to end_year")

    url = (
        f"https://api.worldbank.org/v2/country/{code}/indicator/{indicator_id}"
        f"?format=json&date={start_year}:{end_year}&per_page=200"
    )
    payload = fetch_json(url)
    rows = payload[1] if isinstance(payload, list) and len(payload) > 1 and isinstance(payload[1], list) else []
    observations = normalize_world_bank_rows(rows, indicator_id, indicator)

    return {
        "country": fallback_country(code),
        "indicator": {"id": indicator_id, **indicator},
        "observations": observations,
        "status": source_status_item(
            "world-bank",
            "World Bank",
            f"WDI ({indicator_id})",
            "success" if observations else "partial",
            "Live API",
        ),
    }


@app.get("/api/who/{country_code}/{indicator_id}")
def who(country_code: str, indicator_id: str):
    code = validate_country_code(country_code)
    indicator = WHO_INDICATORS.get(indicator_id)
    if not indicator:
        raise HTTPException(status_code=404, detail="WHO indicator is not allowlisted")

    # Without the Dim1 filter WHO returns male, female and both-sexes rows for every year.
    url = (
        f"https://ghoapi.azureedge.net/api/{indicator_id}"
        f"?$filter=SpatialDim eq '{code}' and Dim1 eq 'SEX_BTSX'"
    )
    payload = fetch_json(url)
    rows = payload.get("value", []) if isinstance(payload, dict) else []

    return {
        "country": fallback_country(code),
        "indicator": {"id": indicator_id, **indicator},
        "observations": normalize_who_rows(rows, indicator_id, indicator),
        "status": source_status_item("who", "WHO", f"GHO ({indicator_id})", "success", "Live API"),
    }


def validate_country_code(country_code: str) -> str:
    """Require an ISO 3166-1 alpha-3 code before it is placed into any upstream URL or filter."""
    if not COUNTRY_CODE_PATTERN.fullmatch(country_code):
        raise HTTPException(status_code=422, detail="country_code must be a 3-letter ISO code")
    return country_code.upper()


def fetch_json(url: str, headers: dict[str, str] | None = None) -> Any:
    """Fetch upstream JSON with a short TTL cache.

    Network, HTTP, or decode failures become a 502 for the client and are never cached.
    """
    now = time.monotonic()
    with _upstream_cache_lock:
        hit = _upstream_cache.get(url)
        if hit and now - hit[0] < UPSTREAM_CACHE_TTL_SECONDS:
            return hit[1]

    extra = {"headers": headers} if headers else {}
    for attempt, delay in enumerate((*UPSTREAM_RETRY_DELAYS_SECONDS, None)):
        try:
            response = HTTP_SESSION.get(url, timeout=REQUEST_TIMEOUT_SECONDS, **extra)
            if response.status_code in RETRYABLE_STATUSES and delay is not None:
                time.sleep(delay)  # Temporary upstream failure (World Bank returns intermittent 502s).
                continue
            response.raise_for_status()
            payload = response.json()
            break
        except requests.HTTPError as error:
            raise HTTPException(status_code=502, detail="Upstream data source is unavailable") from error
        except (requests.RequestException, ValueError) as error:
            # Retry quick failures (dropped connections); a timeout already cost 30s, so fail fast.
            if delay is None or isinstance(error, (ValueError, requests.Timeout)):
                raise HTTPException(status_code=502, detail="Upstream data source is unavailable") from error
            time.sleep(delay)

    with _upstream_cache_lock:
        if len(_upstream_cache) >= UPSTREAM_CACHE_MAX_ENTRIES:
            _upstream_cache.pop(next(iter(_upstream_cache)))  # Drop the oldest entry.
        _upstream_cache[url] = (now, payload)
    return payload


def fallback_country(code: str) -> dict[str, Any]:
    if code in COUNTRY_FALLBACKS:
        return COUNTRY_FALLBACKS[code]
    return {
        "code": code,
        "name": code,
        "officialName": code,
        "flag": "",
        "region": "Unknown",
        "incomeGroup": "Unknown",
        "capital": "Unknown",
        "currency": "Unknown",
        "latitude": 0,
        "longitude": 0,
    }


def overlay_rest_countries(profile: dict[str, Any], record: dict[str, Any]) -> dict[str, Any]:
    """Map a REST Countries v5 record onto the app's profile shape."""
    merged = dict(profile)
    names = record.get("names") or {}
    if names.get("common") and merged.get("name") == merged.get("code"):
        merged["name"] = names["common"]
    if names.get("official"):
        merged["officialName"] = names["official"]
    capitals = record.get("capitals") or []
    primary = next((c for c in capitals if (c.get("attributes") or {}).get("primary")), capitals[0] if capitals else None)
    if primary and primary.get("name"):
        merged["capital"] = primary["name"]
    currencies = record.get("currencies") or []
    if currencies:
        merged["currency"] = ", ".join(c["name"] for c in currencies if c.get("name"))
    languages = [lang["name"] for lang in record.get("languages") or [] if lang.get("name")]
    if languages:
        merged["languages"] = languages
    if (record.get("flag") or {}).get("emoji") and not merged.get("flag"):
        merged["flag"] = record["flag"]["emoji"]
    if record.get("subregion"):
        merged["subregion"] = record["subregion"]
    if isinstance(record.get("population"), (int, float)):
        merged["population"] = record["population"]
    if isinstance((record.get("area") or {}).get("kilometers"), (int, float)):
        merged["areaKm2"] = record["area"]["kilometers"]
    if isinstance(record.get("landlocked"), bool):
        merged["landlocked"] = record["landlocked"]
    if isinstance(record.get("borders"), list):
        merged["borders"] = record["borders"]
    return merged


def normalize_country(code: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Overlay live World Bank fields on the bundled (or placeholder) profile."""
    profile = dict(fallback_country(code))
    name = (payload.get("name") or "").strip()
    region = ((payload.get("region") or {}).get("value") or "").strip()
    income = ((payload.get("incomeLevel") or {}).get("value") or "").strip()
    capital = (payload.get("capitalCity") or "").strip()
    if name and profile["name"] == code:
        profile["name"] = name
        profile["officialName"] = name
    if region:
        profile["region"] = region
    if income:
        profile["incomeGroup"] = income
    if capital:
        profile["capital"] = capital
    return profile


def normalize_world_bank_rows(
    rows: list[dict[str, Any]],
    indicator_id: str,
    indicator: dict[str, str],
) -> list[dict[str, Any]]:
    observations = []
    for row in rows:
        value = row.get("value")
        if value is None:
            continue
        observations.append(
            {
                "year": int(row["date"]),
                "value": float(value),
                "unit": indicator["unit"],
                "source": indicator["source"],
                "sourceId": indicator_id,
                "sourceUrl": indicator["sourceUrl"],
                "note": "Estimate",
            }
        )
    return sorted(observations, key=lambda observation: observation["year"], reverse=True)


def normalize_who_rows(
    rows: list[dict[str, Any]],
    indicator_id: str,
    indicator: dict[str, str],
) -> list[dict[str, Any]]:
    observations = []
    for row in rows:
        value = row.get("NumericValue")
        year = row.get("TimeDim")
        if value is None or year is None:
            continue
        observations.append(
            {
                "year": int(year),
                "value": float(value),
                "unit": indicator["unit"],
                "source": indicator["source"],
                "sourceId": indicator_id,
                "sourceUrl": indicator["sourceUrl"],
                "note": row.get("Value") or "Estimate",
            }
        )
    return sorted(observations, key=lambda observation: observation["year"], reverse=True)


def source_status_item(
    source_id: str,
    name: str,
    detail: str,
    fetch_status: str,
    freshness: str,
) -> dict[str, str]:
    return {
        "id": source_id,
        "name": name,
        "detail": detail,
        "freshness": freshness,
        "fetchStatus": fetch_status,
        "lastFetched": now_iso(),
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

if __name__ == "__main__":
    import uvicorn

    print("Starting Development Data Lab API...")
    print("Dashboard will be available at: http://localhost:5173")
    print("API docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
