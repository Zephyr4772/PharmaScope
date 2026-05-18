"""
LAYER 5: RESILIENCE FORECASTER (Google Trends)
------------------------------------------------
Author: PharmaSynapse Team
Purpose: Predicts shortages based on Search Volume Spikes.
Status: HACKATHON READY (Includes Mock Fallback)

Usage:
    service = TrendsService(mock_mode=False)
    data = service.get_trend("paracetamol")
"""

import time
import random
from typing import Dict, Any
from datetime import datetime

# --- CONFIGURATION ---
# Google Trends blocks aggressive scraping.
# We use a backoff strategy and a "Mock Mode" safety net.
RETRIES = 3
BACKOFF_FACTOR = 1
TIMEZONE_OFFSET = 330  # India Standard Time (IST)

try:
    from pytrends.request import TrendReq
    PYTRENDS_AVAILABLE = True
except ImportError:
    PYTRENDS_AVAILABLE = False
    PYTRENDS_AVAILABLE = False
    import sys
    print("⚠️ pytrends not installed. Run: pip install pytrends", file=sys.stderr)


class TrendsService:
    """
    A robust wrapper around Google Trends.
    Features:
    1. Automatic Retry logic for 429 Errors.
    2. 'Mock Mode' switch for offline demos.
    3. Intelligent keyword cleaning (removes '500mg' etc).
    """

    def __init__(self, geo: str = "IN", language: str = "en-US", mock_mode: bool = False):
        """
        Initialize the service.
        
        Args:
            geo (str): Country code (default 'IN' for India).
            language (str): Language code.
            mock_mode (bool): If True, strictly returns fake data (Safety Net).
        """
        self.geo = geo
        self.language = language
        self.mock_mode = mock_mode
        self.pytrends = None
        
        # Initialize PyTrends only if available and not in mock mode
        if PYTRENDS_AVAILABLE and not self.mock_mode:
            try:
                self.pytrends = TrendReq(
                    hl=language, 
                    tz=TIMEZONE_OFFSET, 
                    retries=RETRIES, 
                    backoff_factor=BACKOFF_FACTOR
                )
            except Exception as e:
                import sys
                print(f"⚠️ PyTrends Init Failed: {e}. Switching to Mock Mode.", file=sys.stderr)
                self.mock_mode = True

    def get_trend(self, drug_name: str) -> Dict[str, Any]:
        """
        The Main Public Method.
        Fetches trend data for a specific drug salt.
        
        Args:
            drug_name (str): The generic name (e.g., "Paracetamol").
            
        Returns:
            Dict: A structured JSON response with prediction flags.
        """
        # 1. CLEANING STEP
        clean_name = self._clean_keyword(drug_name)
        
        # 2. MOCK MODE CHECK
        if self.mock_mode or not PYTRENDS_AVAILABLE:
            return self._get_mock_data(clean_name)

        # 3. LIVE FETCH ATTEMPT
        try:
            # Add a small random sleep to look human (0.5 - 1.5s)
            time.sleep(random.uniform(0.5, 1.5))
            
            # Prepare the Payload
            self.pytrends.build_payload(
                kw_list=[clean_name], 
                geo=self.geo, 
                timeframe='today 1-m'
            )
            
            # Fetch Data
            data = self.pytrends.interest_over_time()

            # Handle Empty Data
            if data.empty:
                import sys
                print(f"ℹ️ No trend data found for '{clean_name}'.", file=sys.stderr)
                return self._generate_response(clean_name, 0, 0, 0, "No Data")

            # 4. ANALYZE DATA
            scores = data[clean_name].values
            
            if len(scores) >= 3:
                recent_score = float(scores[-3:].mean())
            else:
                recent_score = float(scores[-1])
                
            avg_score = float(scores.mean())
            max_score = float(scores.max())
            
            return self._generate_response(clean_name, recent_score, avg_score, max_score)

        except Exception as e:
            # 5. ERROR HANDLING - Fallback to Mock
            import sys
            print(f"⚠️ Google Trends API Error: {str(e)}", file=sys.stderr)
            print(f"🔄 Automatically switching to MOCK data for '{clean_name}'...", file=sys.stderr)
            return self._get_mock_data(clean_name)

    def _clean_keyword(self, raw_name: str) -> str:
        """
        Helper to clean drug names for better search results.
        Example: "Metformin Hydrochloride 500mg" -> "Metformin"
        """
        if not raw_name:
            return "medicine"
            
        parts = raw_name.split()
        
        if len(parts) > 1 and parts[1].lower() not in ['tablet', 'syrup', 'mg', 'hcl', 'capsule', 'injection']:
             return f"{parts[0]} {parts[1]}"
        
        return parts[0]

    def _generate_response(self, name, recent, avg, max_score, status="success"):
        """
        Standardizes the output JSON format.
        """
        # SPIKE DETECTION
        is_spike = (recent > (avg * 1.5)) and (recent > 20)
        
        # TREND DIRECTION
        if recent > (avg * 1.2):
            trend_icon = "Rising 📈"
            prediction = "⚠️ Demand Surge (Possible Shortage)"
            confidence = 0.85
        elif recent < (avg * 0.8):
            trend_icon = "Declining 📉"
            prediction = "✅ Excess Supply"
            confidence = 0.70
        else:
            trend_icon = "Stable ➡️"
            prediction = "✅ Normal Demand"
            confidence = 0.90
            
        # Override for Major Spikes
        if is_spike:
            prediction = "🚨 CRITICAL SHORTAGE RISK"
            confidence = 0.95

        return {
            "drug_name": name,
            "trend_status": trend_icon,
            "prediction_text": prediction,
            "is_spike": is_spike,
            "confidence_score": confidence,
            "metrics": {
                "recent_volume": round(recent, 1),
                "monthly_avg": round(avg, 1),
                "peak_volume": round(max_score, 1)
            },
            "last_updated": datetime.now().strftime("%H:%M:%S"),
            "data_source": "Google Trends (Live)" if status == "success" else "Simulated Model",
            "status": status
        }

    def _get_mock_data(self, name: str) -> Dict[str, Any]:
        """
        Generates realistic fake data so the demo NEVER crashes.
        """
        name_lower = name.lower()
        
        # Demo Drugs - Force specific scenarios
        if "dolo" in name_lower or "para" in name_lower or "remdesivir" in name_lower:
            return self._generate_response(
                name=name,
                recent=92.0,
                avg=45.0,
                max_score=95.0,
                status="mock_fallback"
            )
            
        if "aspirin" in name_lower or "eco" in name_lower:
            return self._generate_response(
                name=name,
                recent=50.0,
                avg=52.0,
                max_score=60.0,
                status="mock_fallback"
            )

        # Random Realistic Data
        base_avg = random.uniform(20.0, 60.0)
        
        if random.random() > 0.8:
            fake_recent = base_avg * 1.4
        else:
            fake_recent = base_avg * random.uniform(0.9, 1.1)
            
        return self._generate_response(
            name=name,
            recent=fake_recent,
            avg=base_avg,
            max_score=base_avg + 15,
            status="mock_fallback"
        )


# ==========================================
# TEST RUNNER
# ==========================================
# ==========================================
# CLI RUNNER (Called by Node.js)
# ==========================================
import sys
import json

if __name__ == "__main__":
    # Check if a drug name was passed as an argument
    if len(sys.argv) > 1:
        drug_query = " ".join(sys.argv[1:])
        
        # Initialize Service
        # Note: Set mock_mode=False to try live data first
        service = TrendsService(geo="IN", mock_mode=False)
        
        # Fetch Data
        try:
            result = service.get_trend(drug_query)
            # Print ONLY the JSON to stdout so Node.js can parse it
            print(json.dumps(result))
        except Exception as e:
            # Fallback error JSON
            print(json.dumps({
                "status": "error",
                "message": str(e),
                "drug_name": drug_query
            }))
    else:
        # Default test behavior if no args provided (for manual testing)
        print("Usage: python trends_service.py <drug_name>")
