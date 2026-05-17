import os
import json
import urllib.request
import urllib.parse
import random
import datetime
from datetime import datetime as dt_class
from fastapi import APIRouter, Query
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")

COMMODITY_PRICES = {
    "Tomato": {"min": 800, "max": 2500, "modal": 1500},
    "Potato": {"min": 600, "max": 1800, "modal": 1100},
    "Onion": {"min": 1000, "max": 3500, "modal": 2000},
    "Rice": {"min": 1800, "max": 3200, "modal": 2400},
    "Wheat": {"min": 2000, "max": 2800, "modal": 2300},
    "Maize": {"min": 1200, "max": 2200, "modal": 1600},
    "Cotton": {"min": 5000, "max": 8000, "modal": 6500},
    "Sugarcane": {"min": 280, "max": 380, "modal": 320},
    "Mango": {"min": 2000, "max": 6000, "modal": 4000},
    "Banana": {"min": 800, "max": 2000, "modal": 1200},
    "Soybean": {"min": 3500, "max": 5000, "modal": 4200},
    "Groundnut": {"min": 4000, "max": 6500, "modal": 5000},
    "Mustard": {"min": 4500, "max": 6000, "modal": 5200},
    "Garlic": {"min": 3000, "max": 8000, "modal": 5500},
    "Ginger": {"min": 4000, "max": 10000, "modal": 7000},
}

STATE_MARKETS = {
    "Andaman and Nicobar Islands": ["Port Blair", "Havelock", "Neil Island"],
    "Andhra Pradesh": ["Vijayawada", "Guntur", "Visakhapatnam", "Kurnool"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
    "Assam": ["Guwahati", "Dibrugarh", "Jorhat", "Silchar"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
    "Chandigarh": ["Chandigarh Market", "Sector 26"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Bhilai"],
    "Dadra and Nagar Haveli": ["Silvassa"],
    "Daman and Diu": ["Daman", "Diu"],
    "Delhi": ["Azadpur", "Okhla", "Keshopur", "Najafgarh"],
    "Goa": ["Panaji", "Margao", "Mapusa"],
    "Gujarat": ["Ahmedabad", "Surat", "Rajkot", "Vadodara"],
    "Haryana": ["Gurugram", "Faridabad", "Karnal", "Ambala"],
    "Himachal Pradesh": ["Shimla", "Solan", "Mandi", "Dharamshala"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
    "Karnataka": ["Bangalore", "Mysore", "Hubli", "Belgaum", "Dharwad"],
    "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
    "Ladakh": ["Leh", "Kargil"],
    "Lakshadweep": ["Kavaratti"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
    "Manipur": ["Imphal"],
    "Meghalaya": ["Shillong"],
    "Mizoram": ["Aizawl"],
    "Nagaland": ["Kohima", "Dimapur"],
    "Odisha": ["Bhubaneshwar", "Cuttack", "Rourkela", "Sambalpur"],
    "Puducherry": ["Puducherry Market"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
    "Sikkim": ["Gangtok"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
    "Tripura": ["Agartala"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Rudrapur"],
    "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Asansol"]
}

@router.get("/")
def get_market_prices(
    commodity: str = Query("Tomato", description="Commodity name"),
    state: str = Query("Karnataka", description="State name")
):
    """
    Fetch live market prices for a commodity from the Government of India API.
    """
    if not DATA_GOV_API_KEY:
        return get_mock_data(commodity, state)

    base_url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    params = {
        "api-key": DATA_GOV_API_KEY,
        "format": "json",
        "filters[commodity]": commodity,
        "filters[state]": state,
        "limit": 10
    }
    
    query_string = urllib.parse.urlencode(params)
    url = f"{base_url}?{query_string}"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            if response.status != 200:
                return get_mock_data(commodity, state)
            
            data = json.loads(response.read().decode())
            records = data.get("records", [])
            
            if not records:
                return get_mock_data(commodity, state)
            
            formatted_data = []
            for record in records:
                formatted_data.append({
                    "market": record.get("market"),
                    "commodity": record.get("commodity"),
                    "variety": record.get("variety"),
                    "min_price": record.get("min_price"),
                    "max_price": record.get("max_price"),
                    "modal_price": record.get("modal_price"),
                    "date": record.get("arrival_date")
                })
            return {
                "data": formatted_data,
                "source": "live",
                "api_source": "data.gov.in",
                "dataset": "Agmarknet 9ef84268",
                "ministry": "Ministry of Agriculture, Govt. of India"
            }

    except Exception as e:
        print(f"Error fetching market prices: {e}")
        return get_mock_data(commodity, state)

def get_mock_data(commodity: str, state: str):
    """
    Return realistic mock data for demo if API fails or key is missing.
    Seeded with the current date to guarantee stable daily prices.
    """
    today = dt_class.now().strftime("%d/%m/%Y")
    
    # Get base prices for commodity, fallback to Tomato if not found
    base = COMMODITY_PRICES.get(commodity, COMMODITY_PRICES["Tomato"])
    
    # Get markets for state, fallback to Karnataka if not found
    markets = STATE_MARKETS.get(state, STATE_MARKETS["Karnataka"])
    
    # FIX 1: Seed random dynamically using today's date + commodity & state features to avoid uniform values
    seed_str = datetime.date.today().strftime("%Y%m%d")
    seed = int(seed_str) + sum(ord(c) for c in commodity + state)
    rng = random.Random(seed)
    
    mock_results = []
    for market in markets:
        # FIX 2: Smaller, realistic variation (±8% max variation)
        variation = rng.uniform(0.92, 1.08)
        
        # FIX 3: Logical price ordering (Bangalore/metro +3%, Hubli/Dharwad/rural -3%)
        market_multiplier = 1.0
        
        # Check for major metropolitan markets
        if market in ["Bangalore", "Mumbai", "Delhi", "Kolkata", "Chennai", "Hyderabad", "Ahmedabad"]:
            market_multiplier = 1.03
        # Check for smaller/rural markets
        elif market in ["Hubli", "Dharwad", "Belgaum"] or "Rural" in market:
            market_multiplier = 0.97
            
        min_p = int(base["min"] * variation * market_multiplier)
        max_p = int(base["max"] * variation * market_multiplier)
        modal_p = int(base["modal"] * variation * market_multiplier)
        
        mock_results.append({
            "market": market,
            "commodity": commodity,
            "variety": "Local",
            "min_price": str(min_p),
            "max_price": str(max_p),
            "modal_price": str(modal_p),
            "date": today
        })
        
    return {
        "data": mock_results,
        "source": "mock",
        "note": "Live API unavailable. Showing estimated prices."
    }
