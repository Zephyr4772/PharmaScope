"""
PharmaSynapse — extract_salts.py
=================================
Reads the live active_db.json (or the latest build master_db.json),
extracts every unique _clean_salt token across all 195k+ records,
normalises via the SYNONYMS map, removes noise tokens, and writes
the master salt list to data/scrapers/unique_salts.txt.

Run: python highway/extract_salts.py

Output: data/scrapers/unique_salts.txt  (one salt per line, A-Z sorted)
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add highway/ to path
sys.path.insert(0, str(Path(__file__).parent))
from config import DATA_SCRAPERS, API_ACTIVE_DB, get_live_build_dir, ensure_dirs

# ── Synonym normalisation (same map as builder.py) ────────────────────────────
# Canonical form is the key used in scraper dicts (generally FDA/USAN name)
SYNONYMS = {
    'acetaminophen': 'paracetamol',
    'salbutamol':    'albuterol',
    'frusemide':     'furosemide',
    'lignocaine':    'lidocaine',
    'adrenaline':    'epinephrine',
    'noradrenaline': 'norepinephrine',
}

# Tokens shorter than this are almost certainly dosage fragments ("mg", "ml", etc.)
MIN_TOKEN_LEN = 4

# Output file
SALTS_FILE = DATA_SCRAPERS / "unique_salts.txt"


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def pick_source() -> Path:
    """
    Returns the best available drug database to extract salts from.
    Priority: live active_db.json → latest build master_db.json
    """
    if API_ACTIVE_DB.exists():
        return API_ACTIVE_DB

    live_dir = get_live_build_dir()
    if live_dir:
        candidate = live_dir / "master_db.json"
        if candidate.exists():
            return candidate

    return None


def extract_tokens(clean_salt: str) -> list[str]:
    """
    Splits a _clean_salt string into individual normalised tokens.
    e.g. 'paracetamol acetaminophen tramadol' → ['paracetamol', 'tramadol']
    (acetaminophen is normalised to paracetamol, which is already present)
    """
    tokens = []
    for raw in clean_salt.lower().split():
        # Strip any trailing punctuation that might survive cleaning
        raw = raw.strip('.,;:()-/')
        if len(raw) < MIN_TOKEN_LEN:
            continue
        normalised = SYNONYMS.get(raw, raw)
        tokens.append(normalised)
    return tokens


def main():
    ensure_dirs()

    log("=" * 55)
    log("PHARMASYNAPSE — Salt Extraction Tool")
    log("=" * 55)

    # 1. Find source database
    source = pick_source()
    if source is None:
        log("CRITICAL: No database found (active_db.json or latest build).")
        log("Run builder.py + promote.py first.")
        sys.exit(1)

    log(f"Source: {source.name}  ({source.stat().st_size / 1024 / 1024:.1f} MB)")

    # 2. Load database
    log("Loading database into memory...")
    with open(source, 'r', encoding='utf-8') as f:
        records = json.load(f)
    log(f"  OK {len(records):,} records loaded.")

    # 3. Extract and deduplicate tokens
    log("Extracting unique salt tokens...")
    seen: set[str] = set()
    skipped_empty = 0

    for record in records:
        clean_salt = record.get('_clean_salt', '').strip()
        if not clean_salt:
            skipped_empty += 1
            continue
        for token in extract_tokens(clean_salt):
            seen.add(token)

    sorted_salts = sorted(seen)
    log(f"  Records with no _clean_salt : {skipped_empty:,}")
    log(f"  Total unique salt tokens    : {len(sorted_salts):,}")

    # 4. Write output
    with open(SALTS_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sorted_salts))

    log(f"  Written → {SALTS_FILE}")

    print()
    print("=" * 55)
    print(f"  DONE — {len(sorted_salts):,} unique salts extracted")
    print(f"  File: {SALTS_FILE}")
    print("=" * 55)


if __name__ == "__main__":
    main()
