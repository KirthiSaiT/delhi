"""LLM layer: facts, template fallback, number guard and the LLM path (network mocked)."""
import json
import pandas as pd
import pytest

from app import llm


def _payload():
    n = 73
    times = [str(t)[:16] for t in pd.date_range("2025-11-01 21:00", periods=n, freq="h")]
    aqi = [220 + (i % 24) * 4 for i in range(n)]
    return dict(
        scenario="live", times=times, dominant="PM2.5",
        delhi=dict(aqi=aqi, pm25=[90.0] * n, pm25_lo=[60.0] * n, pm25_hi=[130.0] * n),
        inversion=dict(hours_moderate_or_strong=22, max_c=3.5, min_pbl_m=60),
        plume=dict(summary=dict(n_fires=66, arrival_h=8, peak_ugm3=12.5)),
        back=dict(arrivals=[dict(dir_from="north-west", dist_km_24h=190, belt_pct=100)]),
        grap=dict(max_stage=2, first_hour={"2": 5}, hours_in_stage={"2": 9}),
        ozone=dict(daily=[dict(o3_peak=160, o3_peak_hour=13)]),
        attribution=dict(share=dict(stubble=25, feedback=4)),
        uncertainty=dict(holdout_coverage=dict(overall=76.2)))


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    llm._cache.clear()
    for k in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"):
        monkeypatch.delenv(k, raising=False)


def test_facts_come_from_the_forecast():
    f = llm.facts(_payload())
    assert f["peak_aqi"] == max(220 + (i % 24) * 4 for i in range(1, 73))
    assert f["grap_max_stage"] == "II" and f["n_fires"] == 66 and f["air_from"] == "north-west"


def test_template_briefing_english_and_hindi_use_only_forecast_numbers():
    f = llm.facts(_payload())
    for lang in ("en", "hi"):
        text = llm.template_briefing(f, lang)
        assert str(f["aqi_now"]) in text and llm.numbers_ok(text, f)


def test_no_key_gives_template_with_note():
    out = llm.briefing(_payload(), "en")
    assert out["source"] == "template" and "No LLM key" in out["note"]


def test_number_guard_blocks_invented_numbers():
    f = llm.facts(_payload())
    assert llm.numbers_ok(f"AQI peaks at {f['peak_aqi']} around {f['peak_time']}.", f)
    assert not llm.numbers_ok("AQI will hit 999 tomorrow.", f)
    assert llm.numbers_ok("AQI " + str(f["aqi_now"]).translate(str.maketrans("0123456789", "०१२३४५६७८९")), f)   # Devanagari digits


def test_llm_reply_is_used_when_grounded(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://x"); monkeypatch.setenv("LLM_API_KEY", "k"); monkeypatch.setenv("LLM_MODEL", "m")
    f = llm.facts(_payload())
    monkeypatch.setattr(llm, "_call", lambda messages: f"Air is {f['cat_now']} now at AQI {f['aqi_now']}.")
    out = llm.briefing(_payload(), "en")
    assert out["source"] == "llm" and out["model"] == "m"


def test_llm_reply_with_invented_number_falls_back(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://x"); monkeypatch.setenv("LLM_API_KEY", "k"); monkeypatch.setenv("LLM_MODEL", "m")
    monkeypatch.setattr(llm, "_call", lambda messages: "AQI will reach 777 tomorrow.")
    out = llm.briefing(_payload(), "en")
    assert out["source"] == "template" and "not in the forecast" in out["note"]


def test_llm_failure_falls_back(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://x"); monkeypatch.setenv("LLM_API_KEY", "k"); monkeypatch.setenv("LLM_MODEL", "m")
    def boom(messages): raise TimeoutError("slow")
    monkeypatch.setattr(llm, "_call", boom)
    out = llm.ask(_payload(), "when is the best time to go out?", "en")
    assert out["source"] == "template" and "TimeoutError" in out["note"]


@pytest.mark.parametrize("q,needle", [
    ("best time to go jogging?", "best time"), ("when is the worst?", "peak"), ("what GRAP stage?", "GRAP"),
    ("where does the air come from", "north-west"), ("how much ozone", "Ozone"), ("tell me a joke", "I can answer")])
def test_template_intents(q, needle):
    assert needle.lower() in llm.ask(_payload(), q, "en")["text"].lower()


def test_endpoints(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    monkeypatch.setattr(main, "get_forecast", lambda scenario="live", refresh=False: _payload())
    c = TestClient(main.app)
    assert c.get("/api/llm").json()["configured"] is False
    assert c.get("/api/briefing?lang=hi").json()["source"] == "template"
    assert c.get("/api/ask?q=" + "x" * 301).status_code == 400
    assert "text" in c.get("/api/ask?q=best time").json()
