from pathlib import Path
import sys

from fastapi.testclient import TestClient
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


client = TestClient(main.app)


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self.payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise main.requests.HTTPError(f"HTTP {self.status_code}")

    def json(self):
        return self.payload


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_world_bank_endpoint_normalizes_observations(monkeypatch):
    def fake_get(url, timeout):
        assert "api.worldbank.org" in url
        assert timeout == main.REQUEST_TIMEOUT_SECONDS
        return FakeResponse(
            [
                {},
                [
                    {"date": "2023", "value": 45_905_417},
                    {"date": "2022", "value": None},
                    {"date": "2021", "value": 41_724_118},
                ],
            ]
        )

    monkeypatch.setattr(main.requests, "get", fake_get)

    response = client.get("/api/world-bank/UGA/SP.POP.TOTL?start_year=2021&end_year=2023")

    assert response.status_code == 200
    payload = response.json()
    assert payload["indicator"]["id"] == "SP.POP.TOTL"
    assert payload["observations"][0]["year"] == 2023
    assert payload["observations"][0]["value"] == 45_905_417
    assert len(payload["observations"]) == 2


def test_world_bank_rejects_unknown_indicator():
    response = client.get("/api/world-bank/UGA/UNKNOWN")

    assert response.status_code == 404
    assert response.json()["detail"] == "Indicator is not allowlisted"


def test_arbitrary_proxy_is_not_available():
    response = client.get("/api/proxy?url=https://example.com")

    assert response.status_code == 404


def test_country_endpoint_uses_fallback_on_upstream_error(monkeypatch):
    def fake_get(url, timeout):
        raise main.requests.RequestException("network unavailable")

    monkeypatch.setattr(main.requests, "get", fake_get)

    response = client.get("/api/countries/UGA")

    assert response.status_code == 200
    assert response.json()["name"] == "Uganda"


def test_year_range_validation():
    response = client.get("/api/world-bank/UGA/SP.POP.TOTL?start_year=2024&end_year=2020")

    assert response.status_code == 400
