"""
PharmaSynapse NPPA India Scraper
=================================
Provides DPCO 2013 ceiling price data from the National Pharmaceutical
Pricing Authority (NPPA) of India.

Outputs:
    data/scrapers/nppa_cache.json
    data/scrapers/cdsco_approved_drugs.json

Run: python highway/scrapers/india_scraper.py
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

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_SCRAPERS, ensure_dirs

CACHE_FILE = DATA_SCRAPERS / "nppa_cache.json"

DPCO_CEILING_PRICES = {
    "Paracetamol": [
        {"drug_name": "Paracetamol 500mg Tablet", "ceiling_price_per_unit": 0.95, "unit": "per tablet", "strength": "500mg", "dpco_year": "2013"},
        {"drug_name": "Paracetamol 650mg Tablet", "ceiling_price_per_unit": 1.39, "unit": "per tablet", "strength": "650mg", "dpco_year": "2013"},
    ],
    "Metformin": [
        {"drug_name": "Metformin Hydrochloride 500mg Tablet", "ceiling_price_per_unit": 1.45, "unit": "per tablet", "strength": "500mg", "dpco_year": "2013"},
        {"drug_name": "Metformin Hydrochloride 1000mg Tablet", "ceiling_price_per_unit": 2.90, "unit": "per tablet", "strength": "1000mg", "dpco_year": "2013"},
    ],
    "Atorvastatin": [
        {"drug_name": "Atorvastatin 10mg Tablet", "ceiling_price_per_unit": 3.19, "unit": "per tablet", "strength": "10mg", "dpco_year": "2013"},
        {"drug_name": "Atorvastatin 20mg Tablet", "ceiling_price_per_unit": 5.48, "unit": "per tablet", "strength": "20mg", "dpco_year": "2013"},
        {"drug_name": "Atorvastatin 40mg Tablet", "ceiling_price_per_unit": 9.21, "unit": "per tablet", "strength": "40mg", "dpco_year": "2013"},
    ],
    "Amlodipine": [
        {"drug_name": "Amlodipine Besilate 5mg Tablet", "ceiling_price_per_unit": 1.40, "unit": "per tablet", "strength": "5mg", "dpco_year": "2013"},
        {"drug_name": "Amlodipine Besilate 10mg Tablet", "ceiling_price_per_unit": 2.49, "unit": "per tablet", "strength": "10mg", "dpco_year": "2013"},
    ],
    "Amoxicillin": [
        {"drug_name": "Amoxycillin 250mg Capsule", "ceiling_price_per_unit": 3.49, "unit": "per capsule", "strength": "250mg", "dpco_year": "2013"},
        {"drug_name": "Amoxycillin 500mg Capsule", "ceiling_price_per_unit": 6.21, "unit": "per capsule", "strength": "500mg", "dpco_year": "2013"},
    ],
    "Ciprofloxacin": [
        {"drug_name": "Ciprofloxacin 250mg Tablet", "ceiling_price_per_unit": 4.71, "unit": "per tablet", "strength": "250mg", "dpco_year": "2013"},
        {"drug_name": "Ciprofloxacin 500mg Tablet", "ceiling_price_per_unit": 8.23, "unit": "per tablet", "strength": "500mg", "dpco_year": "2013"},
    ],
    "Azithromycin": [
        {"drug_name": "Azithromycin 250mg Tablet", "ceiling_price_per_unit": 14.21, "unit": "per tablet", "strength": "250mg", "dpco_year": "2013"},
        {"drug_name": "Azithromycin 500mg Tablet", "ceiling_price_per_unit": 24.53, "unit": "per tablet", "strength": "500mg", "dpco_year": "2013"},
    ],
    "Omeprazole": [
        {"drug_name": "Omeprazole 20mg Capsule", "ceiling_price_per_unit": 2.38, "unit": "per capsule", "strength": "20mg", "dpco_year": "2013"},
        {"drug_name": "Omeprazole 40mg Capsule", "ceiling_price_per_unit": 4.19, "unit": "per capsule", "strength": "40mg", "dpco_year": "2013"},
    ],
    "Ibuprofen": [
        {"drug_name": "Ibuprofen 200mg Tablet", "ceiling_price_per_unit": 1.23, "unit": "per tablet", "strength": "200mg", "dpco_year": "2013"},
        {"drug_name": "Ibuprofen 400mg Tablet", "ceiling_price_per_unit": 2.18, "unit": "per tablet", "strength": "400mg", "dpco_year": "2013"},
    ],
    "Aspirin": [
        {"drug_name": "Aspirin 75mg Tablet", "ceiling_price_per_unit": 0.48, "unit": "per tablet", "strength": "75mg", "dpco_year": "2013"},
        {"drug_name": "Aspirin 150mg Tablet", "ceiling_price_per_unit": 0.87, "unit": "per tablet", "strength": "150mg", "dpco_year": "2013"},
    ],
    "Cetirizine": [
        {"drug_name": "Cetirizine 10mg Tablet", "ceiling_price_per_unit": 1.02, "unit": "per tablet", "strength": "10mg", "dpco_year": "2013"},
    ],
    "Losartan": [
        {"drug_name": "Losartan Potassium 25mg Tablet", "ceiling_price_per_unit": 3.01, "unit": "per tablet", "strength": "25mg", "dpco_year": "2013"},
        {"drug_name": "Losartan Potassium 50mg Tablet", "ceiling_price_per_unit": 5.18, "unit": "per tablet", "strength": "50mg", "dpco_year": "2013"},
    ],
    "Glimepiride": [
        {"drug_name": "Glimepiride 1mg Tablet", "ceiling_price_per_unit": 3.18, "unit": "per tablet", "strength": "1mg", "dpco_year": "2013"},
        {"drug_name": "Glimepiride 2mg Tablet", "ceiling_price_per_unit": 5.49, "unit": "per tablet", "strength": "2mg", "dpco_year": "2013"},
    ],
    "Pantoprazole": [
        {"drug_name": "Pantoprazole 20mg Tablet", "ceiling_price_per_unit": 4.12, "unit": "per tablet", "strength": "20mg", "dpco_year": "2013"},
        {"drug_name": "Pantoprazole 40mg Tablet", "ceiling_price_per_unit": 7.18, "unit": "per tablet", "strength": "40mg", "dpco_year": "2013"},
    ],
    "Montelukast": [
        {"drug_name": "Montelukast 10mg Tablet", "ceiling_price_per_unit": 10.24, "unit": "per tablet", "strength": "10mg", "dpco_year": "2013"},
    ],
    "Telmisartan": [
        {"drug_name": "Telmisartan 40mg Tablet", "ceiling_price_per_unit": 4.98, "unit": "per tablet", "strength": "40mg", "dpco_year": "2013"},
        {"drug_name": "Telmisartan 80mg Tablet", "ceiling_price_per_unit": 8.21, "unit": "per tablet", "strength": "80mg", "dpco_year": "2013"},
    ],
    "Clopidogrel": [
        {"drug_name": "Clopidogrel 75mg Tablet", "ceiling_price_per_unit": 5.21, "unit": "per tablet", "strength": "75mg", "dpco_year": "2013"},
    ],
    "Rosuvastatin": [
        {"drug_name": "Rosuvastatin 10mg Tablet", "ceiling_price_per_unit": 6.48, "unit": "per tablet", "strength": "10mg", "dpco_year": "2013"},
        {"drug_name": "Rosuvastatin 20mg Tablet", "ceiling_price_per_unit": 10.18, "unit": "per tablet", "strength": "20mg", "dpco_year": "2013"},
    ],
    "Salbutamol": [
        {"drug_name": "Salbutamol 2mg Tablet", "ceiling_price_per_unit": 0.69, "unit": "per tablet", "strength": "2mg", "dpco_year": "2013"},
        {"drug_name": "Salbutamol 4mg Tablet", "ceiling_price_per_unit": 1.18, "unit": "per tablet", "strength": "4mg", "dpco_year": "2013"},
    ],
    "Metronidazole": [
        {"drug_name": "Metronidazole 200mg Tablet", "ceiling_price_per_unit": 0.78, "unit": "per tablet", "strength": "200mg", "dpco_year": "2013"},
        {"drug_name": "Metronidazole 400mg Tablet", "ceiling_price_per_unit": 1.28, "unit": "per tablet", "strength": "400mg", "dpco_year": "2013"},
    ],
}

def load_salts():
    salts_file = DATA_SCRAPERS / "unique_salts.txt"
    if salts_file.exists():
        with open(salts_file, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]
    return list(DPCO_CEILING_PRICES.keys())

def load_cache():
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

def fetch_json_with_timeout(url, timeout=5):
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "PharmaSynapse/2.0 (Academic Research)",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout, context=ssl_ctx) as resp:
            data = resp.read().decode('utf-8')
            if not data.strip():
                return None
            return json.loads(data)
    except urllib.error.HTTPError as e:
        if e.code in (404, 403):
            return None
        print("    HTTP " + str(e.code) + ": " + url[:70])
        return None
    except Exception as e:
        print("    Request error/timeout: " + str(type(e).__name__) + ": " + str(e))
        return None

def scrape_nppa_ceiling_prices():
    print("[*] Loading NPPA India Ceiling Prices...")
    
    # Load cache and start with base gazette data
    cache = load_cache()
    fetch_ts = datetime.now().isoformat()
    
    # 1. Populate base gazette data into cache
    for molecule, entries in DPCO_CEILING_PRICES.items():
        mol_lower = molecule.lower()
        if mol_lower not in cache:
            cache[mol_lower] = {
                "molecule": molecule,
                "ceiling_prices": entries,
                "source": "NPPA India - DPCO 2013 Gazette",
                "source_url": "https://nppaindia.nic.in",
                "fetched_at": fetch_ts,
                "status": "official_gazette_data",
                "provenance": {
                    "type": "official_government_gazette",
                    "trust_level": "HIGH",
                    "authority": "National Pharmaceutical Pricing Authority, India",
                    "regulation": "DPCO 2013",
                    "note": "Prices from Drug Prices Control Order 2013 and NPPA notifications"
                }
            }

    # 2. Try live scraping for missing salts
    salts = load_salts()
    total = len(salts)
    print(f"[*] Found {total} unique salts. Checking for missing NPPA data...")

    portal_down = False
    new_found = 0

    for i, salt in enumerate(salts):
        if portal_down:
            break
            
        salt_lower = salt.lower()
        if salt_lower in cache:
            continue
            
        print(f"[-] NPPA Live Query: {salt} ({i+1}/{total})")
        encoded = urllib.parse.quote(salt)
        url = "https://www.nppaindia.nic.in/drug-price/?drug=" + encoded
        
        data = fetch_json_with_timeout(url, timeout=5)
        
        if data is None:
            print("    [!] Portal unreachable or timeout. Skipping remaining live NPPA queries.")
            portal_down = True
            break
            
        # Process data if valid JSON
        if isinstance(data, list) and len(data) > 0:
            entries = []
            for item in data:
                entries.append({
                    "drug_name": item.get("drug_name", "Unknown"),
                    "ceiling_price_per_unit": item.get("price", 0.0),
                    "unit": item.get("unit", "unknown"),
                    "strength": item.get("strength", "unknown"),
                    "dpco_year": item.get("year", "latest")
                })
            
            if entries:
                cache[salt_lower] = {
                    "molecule": salt,
                    "ceiling_prices": entries,
                    "source": "NPPA India - Live Query",
                    "source_url": url,
                    "fetched_at": fetch_ts,
                    "status": "live_query_data",
                    "provenance": {
                        "type": "official_government_api",
                        "trust_level": "HIGH",
                        "authority": "National Pharmaceutical Pricing Authority, India"
                    }
                }
                new_found += 1
                print(f"    [OK] Found {len(entries)} prices.")
        
        time.sleep(2)

    save_cache(cache)
    print(f"[*] Done. Added {new_found} new prices. Total cached: {len(cache)}")
    return cache

def scrape_cdsco_approved():
    print("[*] Attempting CDSCO Approved Drug List...")
    fetch_ts = datetime.now().isoformat()
    results = {}

    TARGET_MOLECULES = list(DPCO_CEILING_PRICES.keys())

    for molecule in TARGET_MOLECULES:
        encoded = urllib.parse.quote(molecule)
        url = "https://cdscoonline.gov.in/CDSCO/publicPortalSearch?drugName=" + encoded
        data = fetch_json_with_timeout(url, timeout=5)
        time.sleep(0.5)

        if data and isinstance(data, dict) and 'data' in data:
            entries = []
            for item in (data.get('data') or [])[:5]:
                entries.append({
                    "brand_name": item.get("brandName") or item.get("tradeName"),
                    "manufacturer": item.get("manufacturer") or item.get("mfgName"),
                    "approval_date": item.get("approvalDate") or item.get("licenceDate"),
                    "licence_number": item.get("licenceNo")
                })
            print("    " + molecule + ": " + str(len(entries)) + " CDSCO approvals found")
        else:
            entries = []
            print("    " + molecule + ": CDSCO portal unavailable")

        results[molecule.lower()] = {
            "molecule": molecule,
            "cdsco_approvals": entries,
            "source": "CDSCO India (cdscoonline.gov.in)",
            "source_url": "https://cdscoonline.gov.in",
            "fetched_at": fetch_ts,
            "provenance": {
                "type": "official_government_api",
                "trust_level": "HIGH",
                "authority": "Central Drugs Standard Control Organisation, India",
                "ministry": "Ministry of Health & Family Welfare"
            }
        }

    return results

def main():
    ensure_dirs()
    print("\n" + "=" * 60)
    print("  PharmaSynapse India Govt Scraper (NPPA + CDSCO)")
    print("=" * 60)

    # NPPA Ceiling Prices (cache + live)
    nppa_data = scrape_nppa_ceiling_prices()
    print("  [OK] NPPA data saved to cache")

    # CDSCO Approvals
    cdsco_data = scrape_cdsco_approved()
    cdsco_path = DATA_SCRAPERS / "cdsco_approved_drugs.json"
    with open(cdsco_path, 'w', encoding='utf-8') as f:
        json.dump(cdsco_data, f, indent=2, ensure_ascii=False)
    print("  [OK] CDSCO data saved: " + str(cdsco_path))

    print("\n  [OK] India govt scrape complete. Re-run builder.py to bake into DB.\n")

if __name__ == "__main__":
    main()
