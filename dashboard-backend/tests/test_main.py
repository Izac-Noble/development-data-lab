from pathlib import Path
import sys

from fastapi.testclient import TestClient
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main


client = TestClient(main.app)


@pytest.fixture(autouse=True)
def isolate_upstreams(monkeypatch):
    """Fresh cache, no retry pauses, and never the developer's real API key from .env."""
    main._upstream_cache.clear()
    monkeypatch.setattr(main, "REST_COUNTRIES_API_KEY", "")
    monkeypatch.setattr(main.time, "sleep", lambda seconds: None)
    yield
    main._upstream_cache.clear()


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

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

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

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    response = client.get("/api/countries/UGA")

    assert response.status_code == 200
    assert response.json()["name"] == "Uganda"


def test_year_range_validation():
    response = client.get("/api/world-bank/UGA/SP.POP.TOTL?start_year=2024&end_year=2020")

    assert response.status_code == 400


def test_world_bank_returns_502_when_upstream_fails(monkeypatch):
    def fake_get(url, timeout):
        return FakeResponse({}, status_code=503)

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    response = client.get("/api/world-bank/UGA/SP.POP.TOTL?start_year=2021&end_year=2023")

    assert response.status_code == 502


def test_world_bank_placeholder_country_has_full_shape(monkeypatch):
    monkeypatch.setattr(main.HTTP_SESSION, "get", lambda url, timeout: FakeResponse([{}, []]))

    response = client.get("/api/world-bank/ETH/SP.POP.TOTL?start_year=2021&end_year=2023")

    assert response.status_code == 200
    assert set(response.json()["country"]) == set(main.COUNTRY_FALLBACKS["UGA"])


@pytest.mark.parametrize("bad_code", ["UG", "UGAA", "U'A"])
def test_country_code_must_be_three_letters(bad_code, monkeypatch):
    def fail_if_called(url, timeout):
        raise AssertionError("upstream should not be called for invalid codes")

    monkeypatch.setattr(main.HTTP_SESSION, "get", fail_if_called)

    for path in (f"/api/countries/{bad_code}", f"/api/who/{bad_code}/WHOSIS_000001"):
        assert client.get(path).status_code == 422


def test_upstream_responses_are_cached(monkeypatch):
    calls = []

    def fake_get(url, timeout):
        calls.append(url)
        return FakeResponse([{}, [{"date": "2023", "value": 1}]])

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    for _ in range(3):
        assert client.get("/api/world-bank/UGA/SP.POP.TOTL?start_year=2021&end_year=2023").status_code == 200

    assert len(calls) == 1


def test_upstream_failures_are_not_cached(monkeypatch):
    # Three 503s exhaust the retries; the next request starts fresh instead of reusing the failure.
    responses = iter([FakeResponse({}, status_code=503)] * 3 + [FakeResponse([{}, [{"date": "2023", "value": 1}]])])
    monkeypatch.setattr(main.HTTP_SESSION, "get", lambda url, timeout: next(responses))

    assert client.get("/api/world-bank/UGA/SP.POP.TOTL").status_code == 502
    assert client.get("/api/world-bank/UGA/SP.POP.TOTL").status_code == 200


def test_temporary_upstream_errors_are_retried(monkeypatch):
    calls = []
    responses = iter([FakeResponse({}, status_code=502), FakeResponse([{}, [{"date": "2023", "value": 7}]])])

    def fake_get(url, timeout):
        calls.append(url)
        return next(responses)

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    response = client.get("/api/world-bank/UGA/SP.POP.TOTL")

    assert response.status_code == 200
    assert response.json()["observations"][0]["value"] == 7
    assert len(calls) == 2


def test_client_errors_are_not_retried(monkeypatch):
    calls = []

    def fake_get(url, timeout):
        calls.append(url)
        return FakeResponse({}, status_code=404)

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    assert client.get("/api/world-bank/UGA/SP.POP.TOTL").status_code == 502
    assert len(calls) == 1


def test_who_requests_both_sexes_only(monkeypatch):
    seen = []

    def fake_get(url, timeout):
        seen.append(url)
        return FakeResponse({"value": [{"TimeDim": 2021, "NumericValue": 63.5, "Value": "63.5"}]})

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    response = client.get("/api/who/UGA/WHOSIS_000001")

    assert response.status_code == 200
    assert "Dim1 eq 'SEX_BTSX'" in seen[0]
    assert response.json()["observations"][0]["value"] == 63.5


def test_country_endpoint_overlays_live_world_bank_metadata(monkeypatch):
    def fake_get(url, timeout):
        assert "api.worldbank.org/v2/country/KEN" in url
        return FakeResponse(
            [
                {},
                [
                    {
                        "id": "KEN",
                        "name": "Kenya",
                        "region": {"value": "Sub-Saharan Africa "},
                        "incomeLevel": {"value": "Upper middle income"},
                        "capitalCity": "Nairobi",
                    }
                ],
            ]
        )

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    payload = client.get("/api/countries/KEN").json()

    assert payload["incomeGroup"] == "Upper middle income"
    assert payload["region"] == "Sub-Saharan Africa"
    assert payload["flag"] == main.COUNTRY_FALLBACKS["KEN"]["flag"]



REST_RECORD = {
    "codes": {"alpha_3": "UGA"},
    "names": {"common": "Uganda", "official": "Republic of Uganda"},
    "capitals": [{"name": "Kampala", "attributes": {"primary": True}}],
    "subregion": "Eastern Africa",
    "population": 45_905_417,
    "area": {"kilometers": 241_550},
    "currencies": [{"code": "UGX", "name": "Ugandan shilling"}],
    "languages": [{"name": "English"}, {"name": "Swahili"}],
    "landlocked": True,
    "borders": ["COD", "KEN", "RWA", "SSD", "TZA"],
}


def fake_country_upstreams(seen):
    def fake_get(url, timeout, headers=None):
        seen.append((url, headers))
        if "restcountries" in url:
            return FakeResponse({"data": {"objects": [REST_RECORD]}})
        return FakeResponse([{}, [{"id": "UGA", "incomeLevel": {"value": "Low income"}}]])

    return fake_get


def test_country_uses_rest_countries_when_key_configured(monkeypatch):
    seen = []
    monkeypatch.setattr(main, "REST_COUNTRIES_API_KEY", "test-key")
    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_country_upstreams(seen))

    payload = client.get("/api/countries/UGA").json()

    rest_call = next(call for call in seen if "restcountries" in call[0])
    assert rest_call[0].startswith("https://api.restcountries.com/countries/v5/codes.alpha_3/UGA")
    assert rest_call[1] == {"Authorization": "Bearer test-key"}
    assert payload["languages"] == ["English", "Swahili"]
    assert payload["areaKm2"] == 241_550
    assert payload["landlocked"] is True
    assert payload["incomeGroup"] == "Low income"
    assert payload["restCountriesStatus"] == "success"
    assert payload["metadataSources"] == ["bundled", "world-bank", "rest-countries"]


def test_country_skips_rest_countries_without_key(monkeypatch):
    seen = []
    monkeypatch.setattr(main, "REST_COUNTRIES_API_KEY", "")
    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_country_upstreams(seen))

    payload = client.get("/api/countries/UGA").json()

    assert not any("restcountries" in url for url, _ in seen)
    assert payload["restCountriesStatus"] == "not-configured"
    assert "languages" not in payload


def test_rest_countries_failure_falls_back_without_leaking_key(monkeypatch):
    def fake_get(url, timeout, headers=None):
        if "restcountries" in url:
            return FakeResponse({"errors": [{"message": "invalid key"}]}, status_code=401)
        return FakeResponse([{}, []])

    monkeypatch.setattr(main, "REST_COUNTRIES_API_KEY", "secret-key")
    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    response = client.get("/api/countries/UGA")

    assert response.status_code == 200
    assert response.json()["restCountriesStatus"] == "error"
    assert "secret-key" not in response.text


def test_rest_countries_record_for_another_country_is_ignored(monkeypatch):
    def fake_get(url, timeout, headers=None):
        if "restcountries" in url:
            return FakeResponse({"data": {"objects": [{**REST_RECORD, "codes": {"alpha_3": "CAN"}, "capitals": [{"name": "Ottawa"}]}]}})
        return FakeResponse([{}, []])

    monkeypatch.setattr(main, "REST_COUNTRIES_API_KEY", "test-key")
    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    payload = client.get("/api/countries/UGA").json()

    assert payload["capital"] == "Kampala"
    assert payload["restCountriesStatus"] == "no-data"



def test_timeouts_are_not_retried(monkeypatch):
    calls = []

    def fake_get(url, timeout):
        calls.append(url)
        raise main.requests.Timeout("read timed out")

    monkeypatch.setattr(main.HTTP_SESSION, "get", fake_get)

    assert client.get("/api/world-bank/UGA/SP.POP.TOTL").status_code == 502
    assert len(calls) == 1
