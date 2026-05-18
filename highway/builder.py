"""
PharmaSynapse Highway Builder v2 (JSON-to-JSON)
===============================================
Reads your pre-compiled base catalog (merged_medicines_reviews.json)
and enriches it with the live Scraper data (OpenFDA, CDSCO).

Output: data/builds/build_{TIMESTAMP}/
  - master_db.json
  - build_meta.json
"""

import json
import time
from datetime import datetime
from pathlib import Path

# Add highway/ to path so config imports work
import sys
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    DATA_RAW, DATA_SCRAPERS, get_build_dir, ensure_dirs
)

# Define paths
BASE_CATALOG = DATA_RAW / "base_catalog.json"
FDA_CACHE   = DATA_SCRAPERS / "openfda_cache.json"
NPPA_CACHE  = DATA_SCRAPERS / "nppa_cache.json"
CDSCO_APPR  = DATA_SCRAPERS / "cdsco_approved_drugs.json"

# ── Synonym Map ────────────────────────────────────────────────────────────────
# Maps Indian/British drug names to their FDA/USAN equivalents used as scraper
# dict keys. Extend this list as new naming mismatches are discovered.
SYNONYMS = {
    'acetaminophen': 'paracetamol',   # same molecule, different names
    'salbutamol':    'albuterol',      # UK/India vs US name
    'frusemide':     'furosemide',     # British vs USAN
    'lignocaine':    'lidocaine',      # British vs USAN
    'adrenaline':    'epinephrine',    # UK vs US
    'noradrenaline': 'norepinephrine', # UK vs US
}


def load_json(path):
    if not path.exists():
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


# ── Step 1+2: Multi-token enrichment with synonym resolution ──────────────────
def enrich_profile(profile, events, recalls, prices, cdsco):
    """
    Enriches a single drug profile with data from the scraper dicts.

    Matching strategy:
      1. Split _clean_salt into individual tokens
         e.g. 'paracetamol acetaminophen tramadol' → ['paracetamol', 'acetaminophen', 'tramadol']
      2. Resolve each token through SYNONYMS map
         e.g. 'acetaminophen' → 'paracetamol'
      3. Try each token as a key in each scraper dict
      4. Take the FIRST match per layer; never overwrite an already-found layer

    This ensures combo drugs like "Paracetamol + Tramadol" correctly get
    enriched with paracetamol's FDA data even though _clean_salt is
    'paracetamol acetaminophen tramadol' not 'paracetamol'.
    """
    clean_salt = profile.get('_clean_salt', '')
    if not clean_salt:
        return profile

    # Split the concatenated salt string into individual tokens
    tokens = clean_salt.split()

    for raw_token in tokens:
        # Resolve synonym (e.g. acetaminophen → paracetamol)
        token = SYNONYMS.get(raw_token, raw_token)

        # Only attach if this layer hasn't been filled by an earlier token
        if token in events and 'layer3_safety' not in profile:
            profile['layer3_safety'] = events[token]

        if token in recalls and 'recent_recalls' not in profile:
            profile['recent_recalls'] = recalls[token]

        if token in prices and 'official_price_ceiling' not in profile:
            profile['official_price_ceiling'] = prices[token]

        if token in cdsco and 'cdsco_approval' not in profile:
            profile['cdsco_approval'] = cdsco[token]

    return profile


def main():
    start_time = time.time()
    ensure_dirs()

    log("=" * 50)
    log("PHARMASYNAPSE HIGHWAY BUILDER (Enrichment Mode)")
    log("=" * 50)

    # 1. Load the heavy base catalog
    if not BASE_CATALOG.exists():
        log(f"CRITICAL: {BASE_CATALOG.name} not found in data/raw/")
        sys.exit(1)

    log("Loading base catalog into memory (this may take a moment)...")
    base_db = load_json(BASE_CATALOG)
    if not isinstance(base_db, list):
        log("CRITICAL: base_catalog is not a JSON list!")
        sys.exit(1)

    log(f"  OK Loaded {len(base_db):,} base drug records.")

    # 2. Load Scraper Intelligence (lowercase all keys for case-insensitive match)
    log("Loading live scraper intelligence...")
    
    fda_cache = load_json(FDA_CACHE)
    events = {}
    recalls = {}
    for k, v in fda_cache.items():
        if "events" in v and v["events"] and v["events"].get("total_reports", 0) > 0:
            events[k.lower()] = v["events"]
        if "recalls" in v and v["recalls"] and v["recalls"].get("recall_count", 0) > 0:
            recalls[k.lower()] = v["recalls"]
            
    prices  = {k.lower(): v for k, v in load_json(NPPA_CACHE).items()}
    cdsco   = {k.lower(): v for k, v in load_json(CDSCO_APPR).items()}

    log(f"  FDA events:  {len(events)} molecules")
    log(f"  FDA recalls: {len(recalls)} molecules")
    log(f"  NPPA prices: {len(prices)} molecules")
    log(f"  CDSCO:       {len(cdsco)} molecules")

    # 3. Enrich the Database (multi-token + synonym-aware matching)
    log("Applying intelligence layers to base catalog...")

    # Layer counters for match stats
    layer_counts = {
        'layer3_safety':         0,
        'recent_recalls':        0,
        'official_price_ceiling': 0,
        'cdsco_approval':        0,
    }
    enrich_count = 0

    for profile in base_db:
        # Snapshot which layers exist before enrichment
        had = {k: k in profile for k in layer_counts}

        enrich_profile(profile, events, recalls, prices, cdsco)

        # Count only newly added layers
        newly_enriched = False
        for layer in layer_counts:
            if not had[layer] and layer in profile:
                layer_counts[layer] += 1
                newly_enriched = True

        if newly_enriched:
            enrich_count += 1

    total = len(base_db)
    match_rate = round((enrich_count / total) * 100, 2) if total > 0 else 0.0

    log(f"  OK Enriched {enrich_count:,} / {total:,} records ({match_rate}% match rate)")
    log(f"     layer3_safety:          {layer_counts['layer3_safety']:,}")
    log(f"     recent_recalls:         {layer_counts['recent_recalls']:,}")
    log(f"     official_price_ceiling: {layer_counts['official_price_ceiling']:,}")
    log(f"     cdsco_approval:         {layer_counts['cdsco_approval']:,}")

    # 4. Write Output
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    build_dir = get_build_dir(timestamp)
    build_dir.mkdir(parents=True, exist_ok=True)

    db_path   = build_dir / "master_db.json"
    meta_path = build_dir / "build_meta.json"

    log(f"Writing versioned database to {build_dir.name}...")

    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(base_db, f)

    # Write Meta — Step 3: include match_stats
    meta = {
        "built_at": timestamp,
        "record_count": total,
        "build_duration_seconds": round(time.time() - start_time, 2),
        "output_size_mb": round(db_path.stat().st_size / (1024 * 1024), 2),
        "enrichment_sources": {
            "base_catalog":    BASE_CATALOG.name,
            "openfda_events":  bool(events),
            "openfda_recalls": bool(recalls),
            "nppa_prices":     bool(prices),
            "cdsco":           bool(cdsco),
        },
        "match_stats": {
            "total_drugs":         total,
            "enriched_drugs":      enrich_count,
            "match_rate_percent":  match_rate,
            "layer_breakdown":     layer_counts,
        }
    }
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=4)

    print("\n" + "=" * 60)
    print("OK  BUILD COMPLETE")
    print("=" * 60)
    print(f"   Output Directory : {build_dir.resolve()}")
    print(f"   Database File    : {db_path.name}  ({meta['output_size_mb']} MB)")
    print(f"   Build Duration   : {meta['build_duration_seconds']}s")
    print(f"   Enriched Records : {enrich_count:,} / {total:,}  ({match_rate}%)")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
