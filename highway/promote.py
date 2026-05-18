"""
PharmaSynapse Promotion Script
==============================
Validates a build and hot-swaps it into production (API/JSON/merged_medicines_reviews.json).
"""

import sys
import json
import shutil
from pathlib import Path
from datetime import datetime

# Add highway/ to path so config imports work
sys.path.insert(0, str(Path(__file__).parent))

from config import DATA_BUILDS, API_ACTIVE_DB, PROJECT_ROOT, LIVE_POINTER

LIVE_DB_TARGET = API_ACTIVE_DB
LIVE_META_TARGET = API_ACTIVE_DB.parent / "current_build.json"

def get_latest_build():
    builds = [d for d in DATA_BUILDS.iterdir() if d.is_dir() and d.name.startswith("build_")]
    if not builds:
        return None
    return sorted(builds, key=lambda x: x.name, reverse=True)[0]

def validate_build(build_dir):
    """Ensure the build has valid files and schema before copying to live."""
    db_file = build_dir / "master_db.json"
    meta_file = build_dir / "build_meta.json"
    
    if not db_file.exists():
        return False, "master_db.json is missing"
    if not meta_file.exists():
        return False, "build_meta.json is missing"
        
    try:
        with open(db_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if not isinstance(data, list):
            return False, "master_db.json is not a valid JSON array"
            
        if len(data) < 10000:
            return False, f"Abnormally low drug count ({len(data)}). Threshold is 10k."
            
        with open(meta_file, 'r', encoding='utf-8') as f:
            meta = json.load(f)
            if "built_at" not in meta:
                return False, "Invalid meta schema"
                
    except json.JSONDecodeError:
        return False, "JSON parsing error (corrupt file)"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"
        
    return True, "Valid"

def promote(timestamp_or_dir):
    if isinstance(timestamp_or_dir, Path):
        build_dir = timestamp_or_dir
        timestamp = build_dir.name.replace("build_", "")
    else:
        build_dir = DATA_BUILDS / f"build_{timestamp_or_dir}"
        timestamp = timestamp_or_dir
        
    print("\n" + "=" * 60)
    print(f"  PharmaSynapse - Promote Build: {timestamp}")
    print("=" * 60)
    
    # 1. Validate
    print("\n[1/4] Validating build...")
    is_valid, reason = validate_build(build_dir)
    
    if not is_valid:
        print(f"\n  [ERROR] VALIDATION FAILED: {reason}")
        print("  Promotion aborted. Live database remains untouched.")
        sys.exit(1)
        
    print("  [OK] Validation passed.")
    
    # 2. Backup current live
    print("\n[2/4] Backing up current active database...")
    if LIVE_DB_TARGET.exists():
        backup_name = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        backup_path = API_ACTIVE_DB.parent / "backups" / backup_name
        backup_path.parent.mkdir(exist_ok=True)
        shutil.copy2(LIVE_DB_TARGET, backup_path)
        print(f"  [OK] Current live db backed up to: API/JSON/backups/{backup_name}")
    else:
        print("  [INFO] No existing live database found to backup.")
        
    # 3. Hot Swap
    print("\n[3/4] Hot-swapping to new build...")
    
    # Write Meta first
    shutil.copy2(build_dir / "build_meta.json", LIVE_META_TARGET)
    
    # Copy DB
    shutil.copy2(build_dir / "master_db.json", LIVE_DB_TARGET)
    
    # Update LIVE_POINTER
    LIVE_POINTER.write_text(build_dir.name, encoding="utf-8")
    
    print("  [OK] Files copied successfully.")
    
    # 4. Success
    print("\n[4/4] Finalizing...")
    print("\n" + "=" * 60)
    print("  [OK] SUCCESS! NEW DATABASE IS LIVE.")
    print("=" * 60)
    print(f"  Live Database   : {LIVE_DB_TARGET.resolve()}")
    print(f"  Active Version  : {timestamp}")
    print("  Please restart your Node.js application to reload data into memory.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
        promote(target)
    else:
        latest = get_latest_build()
        if not latest:
            print("[ERROR] No builds found in data/builds/")
            sys.exit(1)
        print(f"No timestamp given. Auto-selecting latest: {latest.name.replace('build_', '')}")
        promote(latest)
