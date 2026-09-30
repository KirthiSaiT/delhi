from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "cache"
MODELS = ROOT / "models"
CACHE.mkdir(exist_ok=True)
MODELS.mkdir(exist_ok=True)

TZ = "Asia/Kolkata"
HORIZON = 72

# name, lat, lon  (representative NCR receptor points, modelled on CPCB station locations)
STATIONS = [
    ("Anand Vihar", 28.6469, 77.3160), ("RK Puram", 28.5633, 77.1869),
    ("Dwarka", 28.5921, 77.0460), ("Rohini", 28.7325, 77.1170),
    ("ITO", 28.6289, 77.2410), ("Okhla", 28.5308, 77.2710),
    ("Punjabi Bagh", 28.6742, 77.1310), ("Jahangirpuri", 28.7330, 77.1700),
    ("Lodhi Road", 28.5918, 77.2273), ("Mundka", 28.6823, 77.0760),
    ("IGI Airport", 28.5562, 77.1000), ("Gurugram", 28.4595, 77.0266),
    ("Noida", 28.5355, 77.3910), ("Ghaziabad", 28.6692, 77.4538),
    ("Faridabad", 28.4089, 77.3178), ("Sonipat", 28.9931, 77.0151),
    ("Bahadurgarh", 28.6920, 76.9350), ("Greater Noida", 28.4744, 77.5040),
    ("Meerut", 28.9845, 77.7064), ("Bhiwadi", 28.2100, 76.8600),
]

MET_VARS = ["temperature_2m", "relative_humidity_2m", "boundary_layer_height",
            "temperature_925hPa", "wind_speed_10m", "wind_direction_10m",
            "shortwave_radiation", "wind_speed_925hPa", "precipitation"]
AQ_VARS = ["pm2_5", "pm10", "ozone", "nitrogen_dioxide", "aerosol_optical_depth"]

# stubble-burning source region (Punjab / Haryana)
FIRE_BBOX = dict(lat=(28.6, 32.6), lon=(73.6, 77.6))
# regional wind/PBL grid used by the plume engine
WIND_LATS = [27.5 + 0.5 * i for i in range(11)]
WIND_LONS = [73.5 + 0.5 * i for i in range(10)]
# display grid (high-res AQI surface)
GRID_LATS = [28.20 + 0.025 * i for i in range(37)]
GRID_LONS = [76.80 + 0.025 * i for i in range(41)]
