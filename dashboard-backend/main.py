import os
from datetime import datetime, timezone
from typing import Any

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

APP_TITLE = "Development Data Lab API"
DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000"
REQUEST_TIMEOUT_SECONDS = 12

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
        source_status_item("world-bank", "World Bank", "World Development Indicators", "success", "Live API"),
        source_status_item("rest-countries", "REST Countries", "Country metadata enrichment", "partial", "Backend API"),
        source_status_item("who", "WHO", "Global Health Observatory", "partial", "Backend API"),
        source_status_item("unesco", "UNESCO UIS", "Education source under review", "inactive", "Needs revalidation"),
    ]


@app.get("/api/countries/{country_code}")
async def country(country_code: str):
    code = country_code.upper()
    url = f"https://restcountries.com/v3.1/alpha/{code}"

    try:
        payload = fetch_json(url)
        if isinstance(payload, list) and payload:
            return normalize_country(code, payload[0])
    except requests.RequestException:
        if code in COUNTRY_FALLBACKS:
            return COUNTRY_FALLBACKS[code]

    if code in COUNTRY_FALLBACKS:
        return COUNTRY_FALLBACKS[code]

    raise HTTPException(status_code=404, detail="Country metadata is not available")


@app.get("/api/world-bank/{country_code}/{indicator_id}")
async def world_bank(
    country_code: str,
    indicator_id: str,
    start_year: int = Query(1960, ge=1960, le=2100),
    end_year: int = Query(default_factory=lambda: datetime.now(timezone.utc).year, ge=1960, le=2100),
):
    code = country_code.upper()
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
        "country": COUNTRY_FALLBACKS.get(code, {"code": code, "name": code}),
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
async def who(country_code: str, indicator_id: str):
    code = country_code.upper()
    indicator = WHO_INDICATORS.get(indicator_id)
    if not indicator:
        raise HTTPException(status_code=404, detail="WHO indicator is not allowlisted")

    url = f"https://ghoapi.azureedge.net/api/{indicator_id}?$filter=SpatialDim eq '{code}'"
    payload = fetch_json(url)
    rows = payload.get("value", []) if isinstance(payload, dict) else []

    return {
        "country": COUNTRY_FALLBACKS.get(code, {"code": code, "name": code}),
        "indicator": {"id": indicator_id, **indicator},
        "observations": normalize_who_rows(rows, indicator_id, indicator),
        "status": source_status_item("who", "WHO", f"GHO ({indicator_id})", "success", "Live API"),
    }


def fetch_json(url: str) -> Any:
    response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return response.json()


def normalize_country(code: str, payload: dict[str, Any]) -> dict[str, Any]:
    currencies = payload.get("currencies") or {}
    currency = next(iter(currencies.values()), {}).get("name", "Unknown")
    latlng = payload.get("latlng") or [0, 0]
    flag = payload.get("flag") or COUNTRY_FALLBACKS.get(code, {}).get("flag", "")

    return {
        "code": code,
        "name": payload.get("name", {}).get("common", code),
        "officialName": payload.get("name", {}).get("official", code),
        "flag": flag,
        "region": payload.get("subregion") or payload.get("region") or "Unknown",
        "incomeGroup": COUNTRY_FALLBACKS.get(code, {}).get("incomeGroup", "Unknown"),
        "capital": (payload.get("capital") or ["Unknown"])[0],
        "currency": currency,
        "latitude": float(latlng[0]) if len(latlng) > 0 else 0,
        "longitude": float(latlng[1]) if len(latlng) > 1 else 0,
    }


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
