"""Optional LLM layer: plain-language briefing and Q&A over the forecast.

The LLM NEVER produces forecast numbers. It is given a compact fact sheet built from the forecast and may only
rephrase it. Every number in its reply is checked against the fact sheet; if anything is invented, or the API is
missing / down, a deterministic template answer is returned instead.

Configure (any OpenAI-compatible chat API, e.g. GLM / Zhipu, OpenAI, local servers) in backend/.env:
    LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
    LLM_API_KEY=...            (never commit this)
    LLM_MODEL=<exact model id from the provider's docs>
"""
import json
import os
import re
import time
import numpy as np
import pandas as pd
import requests
from .config import ROOT

TTL = 30 * 60
_cache = {}


def _load_env():
    f = ROOT / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env()


def config():
    return dict(base=os.environ.get("LLM_BASE_URL", "").rstrip("/"), key=os.environ.get("LLM_API_KEY", ""),
                model=os.environ.get("LLM_MODEL", ""), timeout=float(os.environ.get("LLM_TIMEOUT", "25")))


def status():
    c = config()
    return dict(configured=bool(c["base"] and c["key"] and c["model"]), model=c["model"] or None)


# ----------------------------------------------------------------------------- fact sheet
def _lab(t):
    return pd.Timestamp(t).strftime("%a %H:%M")


def _cat(v):
    for lim, name in [(50, "Good"), (100, "Satisfactory"), (200, "Moderate"), (300, "Poor"), (400, "Very Poor")]:
        if v <= lim:
            return name
    return "Severe"


def facts(p):
    d, t = p["delhi"], p["times"]
    aqi = np.array(d["aqi"], float)
    fut = aqi[1:]
    pk = int(fut.argmax()) + 1
    nxt = aqi[1:25]
    best = int(nxt.argmin()) + 1
    inv, s = p["inversion"], p["plume"]["summary"]
    b = p["back"]["arrivals"][0]
    g = p["grap"]
    od = p["ozone"]["daily"][0] if p["ozone"]["daily"] else None
    stages = ["", "I", "II", "III", "IV"]
    return dict(
        scenario=p["scenario"], now_time=_lab(t[0]),
        aqi_now=int(round(aqi[0])), cat_now=_cat(aqi[0]), dominant=p["dominant"], pm25_now=int(round(d["pm25"][0])),
        peak_aqi=int(round(fut[pk - 1])), peak_cat=_cat(fut[pk - 1]), peak_time=_lab(t[pk]), peak_hours_ahead=pk,
        pm25_peak_low=int(round(d["pm25_lo"][pk])), pm25_peak_high=int(round(d["pm25_hi"][pk])),
        best_aqi=int(round(nxt[best - 1])), best_time=_lab(t[best]), best_hours_ahead=best,
        hours_poor_or_worse=int((fut > 200).sum()), hours_very_poor_or_worse=int((fut > 300).sum()),
        grap_max_stage=stages[g["max_stage"]] if g["max_stage"] else "none",
        grap_first_hour=(g["first_hour"].get(str(g["max_stage"])) if g["max_stage"] else None),
        grap_hours_at_max=g["hours_in_stage"].get(str(g["max_stage"]), 0) if g["max_stage"] else 0,
        inversion_hours=inv["hours_moderate_or_strong"], inversion_max_c=inv["max_c"], min_pbl_m=inv["min_pbl_m"],
        n_fires=s["n_fires"], fire_arrival_h=s["arrival_h"], stubble_peak_ugm3=s["peak_ugm3"],
        stubble_share_pct=p["attribution"]["share"]["stubble"], feedback_share_pct=p["attribution"]["share"]["feedback"],
        air_from=b["dir_from"], air_from_km=b["dist_km_24h"], belt_pct=b["belt_pct"],
        ozone_peak=(int(od["o3_peak"]) if od else None), ozone_peak_hour=(int(od["o3_peak_hour"]) if od else None),
        band_coverage_pct=((p["uncertainty"].get("holdout_coverage") or {}).get("overall")))


# ----------------------------------------------------------------------------- template answers (no LLM)
def _hi_cat(c):
    return {"Good": "अच्छी", "Satisfactory": "संतोषजनक", "Moderate": "मध्यम", "Poor": "खराब",
            "Very Poor": "बहुत खराब", "Severe": "गंभीर"}.get(c, c)


_DIR_HI = {"north": "उत्तर", "north-east": "उत्तर-पूर्व", "east": "पूर्व", "south-east": "दक्षिण-पूर्व", "south": "दक्षिण",
           "south-west": "दक्षिण-पश्चिम", "west": "पश्चिम", "north-west": "उत्तर-पश्चिम"}


_DAY_HI = {"Mon": "सोम", "Tue": "मंगल", "Wed": "बुध", "Thu": "गुरु", "Fri": "शुक्र", "Sat": "शनि", "Sun": "रवि"}


def _hi_time(s):
    for en, hi in _DAY_HI.items():
        s = s.replace(en, hi)
    return s


def template_briefing(f, lang="en"):
    if lang == "hi":
        f = dict(f, peak_time=_hi_time(f["peak_time"]), best_time=_hi_time(f["best_time"]))
        s = [f"दिल्ली की हवा अभी {_hi_cat(f['cat_now'])} है (AQI {f['aqi_now']}, मुख्य प्रदूषक {f['dominant']})।",
             f"अगले 72 घंटों में AQI {f['peak_time']} के आसपास {f['peak_aqi']} ({_hi_cat(f['peak_cat'])}) तक जा सकता है; "
             f"अगले 24 घंटे में सबसे अच्छा समय {f['best_time']} के आसपास (AQI {f['best_aqi']}) है।"]
        if f["grap_max_stage"] != "none":
            s.append(f"पूर्वानुमान के अनुसार GRAP का चरण {f['grap_max_stage']} लगभग {f['grap_hours_at_max']} घंटे तक संभव है (केवल संकेतात्मक)।")
        if f["inversion_hours"]:
            s.append(f"{f['inversion_hours']} घंटे तक मध्यम या तेज़ इन्वर्जन रहेगा, मिश्रण परत {f['min_pbl_m']} मीटर तक गिर सकती है, जिससे प्रदूषण ज़मीन के पास फँसता है।")
        if f["n_fires"]:
            s.append(f"पंजाब-हरियाणा में {f['n_fires']} आग मिलीं; दिल्ली में उनका योगदान अधिकतम लगभग {f['stubble_peak_ugm3']} µg/m³ है।")
        s.append(f"दिल्ली की हवा ज़्यादातर {_DIR_HI.get(f['air_from'], f['air_from'])} दिशा से आ रही है।")
        s.append("यह मॉडल का पूर्वानुमान है, इसमें अनिश्चितता है; आधिकारिक CPCB/CAQM सूचनाएँ देखें।")
        return " ".join(s)
    s = [f"Delhi's air is {f['cat_now']} right now (AQI {f['aqi_now']}, mainly {f['dominant']}).",
         f"Over the next 72 hours AQI is expected to peak at {f['peak_aqi']} ({f['peak_cat']}) around {f['peak_time']}; "
         f"the best time in the next 24 hours is around {f['best_time']} (AQI {f['best_aqi']})."]
    if f["grap_max_stage"] != "none":
        s.append(f"The forecast would reach GRAP Stage {f['grap_max_stage']} for about {f['grap_hours_at_max']} hours (indicative only).")
    if f["inversion_hours"]:
        s.append(f"A moderate or strong inversion lasts about {f['inversion_hours']} hours and the mixing layer can drop to {f['min_pbl_m']} m, "
                 "which traps pollution near the ground.")
    if f["n_fires"]:
        s.append(f"{f['n_fires']} fires were detected over Punjab and Haryana; their smoke adds at most about {f['stubble_peak_ugm3']} µg/m³ in Delhi.")
    s.append(f"Delhi's air is coming mostly from the {f['air_from']}.")
    s.append("This is a model forecast with uncertainty; please follow official CPCB and CAQM updates.")
    return " ".join(s)


_INTENTS = [
    (("best", "safe", "go out", "outside", "jog", "walk", "exercise", "run"), "best"),
    (("worst", "peak", "highest", "bad"), "peak"),
    (("grap", "stage", "restriction"), "grap"),
    (("where", "source", "come from", "direction", "wind from"), "source"),
    (("stubble", "fire", "smoke", "burn"), "fire"),
    (("ozone", "o3", "no2", "nox"), "ozone"),
    (("inversion", "lid", "trap", "mixing"), "inversion"),
    (("why", "reason", "cause"), "why"),
]


def template_answer(f, q, lang="en"):
    ql = q.lower()
    if lang == "hi":
        f = dict(f, peak_time=_hi_time(f["peak_time"]), best_time=_hi_time(f["best_time"]))
    intent = next((i for words, i in _INTENTS if any(w in ql for w in words)), None)
    hi = lang == "hi"
    if intent == "best":
        return (f"अगले 24 घंटे में बाहर जाने का सबसे अच्छा समय {f['best_time']} के आसपास है (AQI {f['best_aqi']})।" if hi else
                f"The best time in the next 24 hours is around {f['best_time']} (AQI {f['best_aqi']}).")
    if intent == "peak":
        return (f"AQI {f['peak_time']} के आसपास {f['peak_aqi']} तक पहुँच सकता है।" if hi else
                f"AQI is expected to peak at {f['peak_aqi']} ({f['peak_cat']}) around {f['peak_time']}.")
    if intent == "grap":
        if f["grap_max_stage"] == "none":
            return "अगले 72 घंटों में कोई GRAP चरण अपेक्षित नहीं है (संकेतात्मक)।" if hi else "No GRAP stage is expected in the next 72 hours (indicative)."
        return (f"GRAP का चरण {f['grap_max_stage']} लगभग {f['grap_hours_at_max']} घंटे के लिए संभव है (संकेतात्मक)।" if hi else
                f"GRAP Stage {f['grap_max_stage']} is possible for about {f['grap_hours_at_max']} hours (indicative only).")
    if intent == "source":
        return (f"हवा ज़्यादातर {_DIR_HI.get(f['air_from'], f['air_from'])} दिशा से, लगभग {f['air_from_km']} किमी दूर से आ रही है।" if hi else
                f"The air is coming mostly from the {f['air_from']}, about {f['air_from_km']} km away 24 hours earlier.")
    if intent == "fire":
        return (f"{f['n_fires']} आग मिलीं; दिल्ली में उनका अधिकतम योगदान लगभग {f['stubble_peak_ugm3']} µg/m³ है।" if hi else
                f"{f['n_fires']} fires were detected; their peak contribution in Delhi is about {f['stubble_peak_ugm3']} µg/m³.")
    if intent == "ozone":
        if f["ozone_peak"] is None:
            return "ओज़ोन का डेटा उपलब्ध नहीं है।" if hi else "Ozone data is not available."
        return (f"ओज़ोन दोपहर में {f['ozone_peak_hour']}:00 के आसपास लगभग {f['ozone_peak']} µg/m³ तक पहुँचता है।" if hi else
                f"Ozone peaks around {f['ozone_peak_hour']}:00 at about {f['ozone_peak']} µg/m³.")
    if intent == "inversion":
        return (f"{f['inversion_hours']} घंटे मध्यम या तेज़ इन्वर्जन रहेगा; मिश्रण परत {f['min_pbl_m']} मीटर तक गिर सकती है।" if hi else
                f"A moderate or strong inversion lasts about {f['inversion_hours']} hours; the mixing layer can drop to {f['min_pbl_m']} m.")
    if intent == "why":
        return (f"PM2.5 का {f['stubble_share_pct']}% पराली से और {f['feedback_share_pct']}% फीडबैक से है; बाकी पृष्ठभूमि है। इन्वर्जन {f['inversion_hours']} घंटे रहेगा।" if hi else
                f"About {f['stubble_share_pct']}% of PM2.5 is from stubble smoke and {f['feedback_share_pct']}% from the feedback loop; the rest is background. "
                f"An inversion lasts about {f['inversion_hours']} hours.")
    return ("मैं सबसे अच्छे समय, चरम AQI, GRAP, हवा के स्रोत, पराली, ओज़ोन और इन्वर्जन के बारे में बता सकता हूँ।" if hi else
            "I can answer about the best time to go out, the peak AQI, GRAP, where the air comes from, stubble smoke, ozone and the inversion.")


# ----------------------------------------------------------------------------- LLM call with number guard
_DEV = str.maketrans("०१२३४५६७८९", "0123456789")
_NUM = re.compile(r"\d+(?:\.\d+)?")
_ALWAYS_OK = {str(i) for i in range(0, 11)} | {"24", "72", "100"}


def _allowed(f):
    nums = set(_NUM.findall(json.dumps(f)))
    for v in list(nums):
        if "." in v:
            nums.add(str(int(round(float(v)))))
    return nums | _ALWAYS_OK


def numbers_ok(text, f):
    used = set(_NUM.findall(text.translate(_DEV)))
    return used <= _allowed(f)


def _call(messages):
    c = config()
    r = requests.post(f"{c['base']}/chat/completions", timeout=c["timeout"],
                      headers={"Authorization": f"Bearer {c['key']}", "Content-Type": "application/json"},
                      json=dict(model=c["model"], messages=messages, temperature=0.2, max_tokens=450))
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()


SYSTEM = ("You are the AirCouple air-quality briefer for Delhi NCR. Use ONLY the facts in the JSON. Never add a number that is not in the JSON. "
          "Be plain and calm; no medical diagnosis. Say it is a model forecast with uncertainty. GRAP stages are indicative, not official.")


def _ask_llm(task, f, lang, q=None):
    langname = "Hindi (Devanagari script)" if lang == "hi" else "English"
    user = f"Facts (JSON): {json.dumps(f)}\n\nTask: {task}\nLanguage: {langname}."
    if q:
        user += f"\nQuestion: {q}\nIf the facts cannot answer it, say so in one sentence."
    return _call([{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}])


def _answer(kind, p, lang, q=None):
    f = facts(p)
    key = (kind, p["scenario"], p["times"][0], lang, q)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < TTL:
        return hit[1]
    tmpl = template_briefing(f, lang) if kind == "briefing" else template_answer(f, q, lang)
    out = dict(text=tmpl, source="template", model=None, note=None)
    if status()["configured"]:
        task = ("Write a 4-6 sentence briefing of the Delhi air-quality outlook: now, the peak and when, the best time, GRAP, the main reason."
                if kind == "briefing" else "Answer the question briefly (1-3 sentences).")
        try:
            text = _ask_llm(task, f, lang, q)
            if text and numbers_ok(text, f):
                out = dict(text=text, source="llm", model=config()["model"], note=None)
            else:
                out["note"] = "LLM reply contained numbers that are not in the forecast, so the template answer is shown."
        except Exception as e:                      # API down, bad key, timeout ...
            out["note"] = f"LLM unavailable ({e.__class__.__name__}); template answer shown."
    else:
        out["note"] = "No LLM key configured; template answer shown."
    _cache[key] = (time.time(), out)
    if len(_cache) > 128:
        _cache.pop(min(_cache, key=lambda k: _cache[k][0]))
    return out


def briefing(p, lang="en"):
    return _answer("briefing", p, lang)


def ask(p, q, lang="en"):
    return _answer("ask", p, lang, q.strip()[:300])
