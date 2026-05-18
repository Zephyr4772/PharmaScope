"""
PharmaSynapse OpenFDA Scraper
==============================
Fetches official drug adverse event and enforcement (recall) data
from the OpenFDA REST API and saves structured JSON to data/scrapers/.

Data is tagged with fetch timestamp and source URL for full provenance.

Outputs:
    data/scrapers/openfda_cache.json
    data/scrapers/openfda_progress.json

Run: python highway/scrapers/openfda_scraper.py
"""

import json
import time
import urllib.request
import urllib.error
import urllib.parse
import ssl
from datetime import datetime
from pathlib import Path

# Create unverified SSL context for local development
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# Add highway/ to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_SCRAPERS, ensure_dirs

# -- Config -----------------------------------------------------------------
OPENFDA_BASE = "https://api.fda.gov"

# Delay between API calls to respect rate limits
RATE_LIMIT_DELAY = 1.2
BATCH_SIZE = 50

CACHE_FILE = DATA_SCRAPERS / "openfda_cache.json"
PROGRESS_FILE = DATA_SCRAPERS / "openfda_progress.json"

def fetch_json(url):
    """Simple HTTP GET that returns parsed JSON or None on failure."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PharmaSynapse/2.0"})
        with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # No results - not an error
        print("    HTTP " + str(e.code) + " for: " + url[:80])
        return None
    except Exception as e:
        print("    Request failed: " + str(type(e).__name__) + ": " + str(e))
        return None

def load_salts():
    salts_file = DATA_SCRAPERS / "unique_salts.txt"
    if salts_file.exists():
        with open(salts_file, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]
    return [
        "paracetamol", "metformin", "atorvastatin", "amoxicillin", "ibuprofen",
        "omeprazole", "amlodipine", "ciprofloxacin", "azithromycin", "losartan",
        "clopidogrel", "rosuvastatin", "pantoprazole", "telmisartan", "glimepiride",
        "aspirin", "cetirizine", "montelukast", "salbutamol", "insulin"
    ]

def load_progress():
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"last_completed_index": 0, "total": 0}

def save_progress(index, total):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump({"last_completed_index": index, "total": total}, f, indent=2)

def load_cache():
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

def scrape_adverse_events(drug, fetch_ts):
    encoded = urllib.parse.quote(drug)
    count_url = (
        OPENFDA_BASE + "/drug/event.json"
        "?search=patient.drug.medicinalproduct:" + encoded
        + "&limit=1"
    )

    data = fetch_json(count_url)
    time.sleep(RATE_LIMIT_DELAY)

    total_reports = 0
    if data and 'meta' in data:
        total_reports = data['meta'].get('results', {}).get('total', 0)

    serious_count = 0
    if total_reports > 0:
        seriousness_url = (
            OPENFDA_BASE + "/drug/event.json"
            "?search=patient.drug.medicinalproduct:" + encoded
            + "+AND+serious:1"
            + "&limit=1"
        )
        serious_data = fetch_json(seriousness_url)
        time.sleep(RATE_LIMIT_DELAY)
        if serious_data and 'meta' in serious_data:
            serious_count = serious_data['meta'].get('results', {}).get('total', 0)

    non_serious = max(0, total_reports - serious_count)

    if total_reports > 0:
        print("    [Events] " + drug + ": " + str(total_reports) + " total reports (" + str(serious_count) + " serious)")
    else:
        print("    [Events] " + drug + ": No adverse event data found")

    return {
        "drug": drug,
        "total_reports": total_reports,
        "serious_count": serious_count,
        "non_serious_count": non_serious,
        "source": "OpenFDA drug/event API",
        "source_url": OPENFDA_BASE + "/drug/event.json",
        "fetched_at": fetch_ts,
        "provenance": {
            "type": "official_api",
            "trust_level": "HIGH",
            "agency": "FDA (US)"
        }
    }

def scrape_recalls(drug, fetch_ts):
    encoded = urllib.parse.quote(drug)
    url = (
        OPENFDA_BASE + "/drug/enforcement.json"
        "?search=product_description:" + encoded
        + "&limit=10"
    )

    data = fetch_json(url)
    time.sleep(RATE_LIMIT_DELAY)

    if not data or 'results' not in data:
        return {
            "drug": drug,
            "recall_count": 0,
            "recalls": [],
            "source": "OpenFDA drug/enforcement API",
            "fetched_at": fetch_ts,
            "provenance": {
                "type": "official_api",
                "trust_level": "HIGH",
                "agency": "FDA (US)"
            }
        }

    recalls = []
    for r in data.get('results', []):
        recalls.append({
            "recall_number": r.get('recall_number'),
            "classification": r.get('classification'),
            "reason": r.get('reason_for_recall', '')[:300],
            "recalling_firm": r.get('recalling_firm'),
            "recall_initiation_date": r.get('recall_initiation_date'),
            "status": r.get('status'),
            "country": r.get('country')
        })

    print("    [Recalls] " + drug + ": " + str(len(recalls)) + " recall records found.")
    return {
        "drug": drug,
        "recall_count": len(recalls),
        "recalls": recalls,
        "source": "OpenFDA drug/enforcement API",
        "fetched_at": fetch_ts,
        "provenance": {
            "type": "official_api",
            "trust_level": "HIGH",
            "agency": "FDA (US)"
        }
    }

def main():
    ensure_dirs()
    print("\n" + "=" * 60)
    print("  PharmaSynapse OpenFDA Scraper (Batched)")
    print("=" * 60)

    salts = load_salts()
    total_salts = len(salts)
    print(f"[*] Loaded {total_salts} unique salts to process.")

    progress = load_progress()
    start_index = progress.get("last_completed_index", 0)
    
    if start_index >= total_salts:
        print("[*] Reached end of list. Restarting from beginning.")
        start_index = 0

    end_index = min(start_index + BATCH_SIZE, total_salts)
    batch = salts[start_index:end_index]

    cache = load_cache()
    fetch_ts = datetime.now().isoformat()

    print(f"[*] Processing batch: {start_index} to {end_index}...")

    for i, drug in enumerate(batch):
        print(f"\n[-] Querying: {drug} ({start_index + i + 1}/{total_salts})")
        events_data = scrape_adverse_events(drug, fetch_ts)
        recalls_data = scrape_recalls(drug, fetch_ts)
        
        # Merge into cache
        cache[drug] = {
            "events": events_data,
            "recalls": recalls_data
        }

    save_cache(cache)
    save_progress(end_index, total_salts)

    pct = round((end_index / total_salts) * 100, 1) if total_salts > 0 else 100
    print(f"\n[*] Processed {end_index}/{total_salts} unique salts ({pct}%).")
    print(f"[*] Cache saved to {CACHE_FILE.name}")
    print("\n  [OK] OpenFDA scrape complete for this batch. Re-run builder.py to bake into DB.\n")

if __name__ == "__main__":
    main()
