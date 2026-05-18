import sys
import json
from pathlib import Path
from datetime import datetime

# PROJECT_ROOT is the parent of the highway/ folder
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Data Folders
DATA_DIR = PROJECT_ROOT / "data"
DATA_RAW = DATA_DIR / "raw"
DATA_BUILDS = DATA_DIR / "builds"
DATA_SCRAPERS = DATA_DIR / "scrapers"

# Raw CSV Paths (these point to data/raw/)
MEDICINE_CSV = DATA_RAW / "medicine_data.csv"
REVIEWS_CSV = DATA_RAW / "drugsComTrain_raw.csv"
SHORTAGES_CSV = DATA_RAW / "Drugshortages.csv"
BAD_ACTORS_CSV = DATA_RAW / "bad_actors.csv"

# Build Paths
LIVE_POINTER = DATA_DIR / "LIVE_BUILD.txt"
# API_ACTIVE_DB is the file promote.py copies to — this is what server.js loads at startup
API_ACTIVE_DB = PROJECT_ROOT / "API" / "JSON" / "active_db.json"

def get_build_dir(timestamp: str) -> Path:
    return DATA_BUILDS / f"build_{timestamp}"

def get_live_build_dir() -> Path:
    if LIVE_POINTER.exists():
        build_name = LIVE_POINTER.read_text(encoding='utf-8').strip()
        if build_name:
            return DATA_BUILDS / build_name
    return None

def ensure_dirs():
    """Creates all required folders if they are missing."""
    DATA_RAW.mkdir(parents=True, exist_ok=True)
    DATA_BUILDS.mkdir(parents=True, exist_ok=True)
    DATA_SCRAPERS.mkdir(parents=True, exist_ok=True)

if __name__ == "__main__":
    ensure_dirs()
    print("Folders created successfully.")
