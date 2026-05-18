import sys
import shutil
import argparse
from pathlib import Path

# Add highway/ to path so config imports work
sys.path.insert(0, str(Path(__file__).parent))

from config import DATA_BUILDS, LIVE_POINTER

def get_live_build_name():
    if LIVE_POINTER.exists():
        return LIVE_POINTER.read_text(encoding="utf-8").strip()
    return None

def cleanup_builds(dry_run=False):
    print("============================================================")
    print("  PharmaSynapse Build Cleanup Utility")
    print("============================================================")

    if dry_run:
        print("  [DRY RUN MODE] No files will be deleted.")
        print()

    # Get all build directories
    build_dirs = [d for d in DATA_BUILDS.iterdir() if d.is_dir() and d.name.startswith("build_")]
    
    # Sort builds (newest first)
    build_dirs.sort(key=lambda x: x.name, reverse=True)

    if len(build_dirs) < 3:
        print(f"  Cleanup not needed. Only {len(build_dirs)} build(s) exist.")
        print("============================================================")
        return

    live_build_name = get_live_build_name()
    if live_build_name:
        print(f"  Live Build: {live_build_name} (Will be protected)")
    else:
        print("  [WARN] LIVE_BUILD.txt not found or empty. No build is protected as 'live'.")

    # Determine which builds to keep
    # 1. Protect the live build
    # 2. Keep the 2 most recent NON-LIVE builds
    builds_to_keep = set()
    
    if live_build_name:
        builds_to_keep.add(live_build_name)
        
    non_live_builds_kept = 0
    for b in build_dirs:
        if b.name == live_build_name:
            continue
        if non_live_builds_kept < 2:
            builds_to_keep.add(b.name)
            non_live_builds_kept += 1
            
    # Determine which builds to delete
    builds_to_delete = [b for b in build_dirs if b.name not in builds_to_keep]

    # Print summary
    print(f"  Total Builds : {len(build_dirs)}")
    print(f"  Keeping      : {len(builds_to_keep)}")
    print(f"  Deleting     : {len(builds_to_delete)}")
    print()

    # Execute deletions
    deleted_count = 0
    for b in builds_to_delete:
        if dry_run:
            print(f"  [DRY RUN] Would delete: {b.name}")
        else:
            try:
                shutil.rmtree(b)
                print(f"  [DELETED] {b.name}")
                deleted_count += 1
            except Exception as e:
                print(f"  [ERROR] Failed to delete {b.name}: {e}")

    print("============================================================")
    if dry_run:
        print("  Dry run complete.")
    else:
        print(f"  Cleanup complete. Removed {deleted_count} old builds.")
    print("============================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean up old build folders.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without actually deleting")
    args = parser.parse_args()

    cleanup_builds(dry_run=args.dry_run)
