from xml.parsers.expat import model

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
# Enable CORS for frontend requests
CORS(app, resources={r"/*": {"origins": "*"}})

# API Keys
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY") or os.getenv("VITE_OPENWEATHER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize Gemini Client
try:
    genai.configure(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
except Exception as e:
    print(f"Error initializing Gemini client in Flask: {e}")
    client = None

@app.route("/", methods=["GET"])
def index():
    return jsonify({"name": "AgroVision Crop Recommendation API", "status": "running"})

@app.route("/crop-recommendation", methods=["POST"])
def crop_recommendation():
    if not client:
        return jsonify({
            "status": "error",
            "message": "Gemini AI client is not configured or available on the backend."
        }), 500

    if not OPENWEATHER_API_KEY:
        return jsonify({
            "status": "error",
            "message": "OpenWeather API key is not configured on the backend."
        }), 500

    data = request.json or {}
    print("Incoming Request:", data)
    location = data.get("location")
    lat = data.get("lat")
    lon = data.get("lon")

    if not location and (lat is None or lon is None):
        return jsonify({
            "status": "error",
            "message": "Please provide a location name or coordinates (lat, lon)."
        }), 400

    try:
        # 1. Fetch live weather data from OpenWeatherMap
        weather_url = "https://api.openweathermap.org/data/2.5/weather"
        
        if lat is not None and lon is not None:
            params = {
                "lat":str(lat),
                "lon": str(lon),
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            }
        else:
            params = {
                "q": location,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            }

        response = requests.get(weather_url, params=params)
        print("WEATHER PARAMS:", params)
        print("WEATHER RESPONSE:", response.text)
        
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"Could not fetch weather data: {response.json().get('message', 'Unknown weather API error')}"
            }), 400

        weather_data = response.json()
        print("Weather API Response:", weather_data)
        # Extract details
        temperature = weather_data["main"]["temp"]
        humidity = weather_data["main"]["humidity"]
        condition = weather_data["weather"][0]["description"].capitalize()
        wind_speed = weather_data["wind"]["speed"]
        resolved_location = weather_data["name"]
        
        # Rainfall estimation from weather data if available
        # rain can be in rain.1h or rain.3h
        rain_info = weather_data.get("rain", {})
        rainfall_val = rain_info.get("1h", rain_info.get("3h", 0))
        
        if rainfall_val > 0:
            rainfall = f"{rainfall_val} mm (Live Precipitation)"
        else:
            # Descriptive fallback if no active rain registered in OpenWeatherMap
            if "rain" in condition.lower() or "drizzle" in condition.lower():
                rainfall = "Moderate (Currently raining)"
            elif "thunderstorm" in condition.lower():
                rainfall = "High (Heavy precipitation)"
            elif humidity > 80:
                rainfall = "High humidity / Potential moderate rainfall"
            else:
                rainfall = "0 mm (Dry / Low chance of rain)"

        # 2. Process weather details and format Gemini Prompt
        prompt = f"""
        You are an agriculture expert AI.

        Analyze the following live weather conditions and suggest the most suitable crops for farming.

        Weather Details:
        * Temperature: {temperature}°C
        * Humidity: {humidity}%
        * Rainfall: {rainfall}
        * Weather Condition: {condition}
        * Wind Speed: {wind_speed} m/s
        * Location: {resolved_location}

        Based on these conditions:
        1. Suggest suitable crops.
        2. Explain why they are suitable.
        3. Mention water requirements.
        4. Mention possible farming risks.
        5. Keep the response short and farmer-friendly.
        """

        # 3. Request recommendation from Gemini
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")

            response = model.generate_content(prompt)

            recommendation_text = response.text

        except Exception as gemini_error:
            print("FULL ERROR:", gemini_error)

            recommendation_text = """
            Suitable Crops:
            - Rice
            - Maize
            - Groundnut

            Weather conditions are moderate for farming.
            Please consult local agricultural experts before cultivation.
            """

        return jsonify({
            "status": "success",
            "weather": {
                "temperature": f"{temperature}°C",
                "humidity": f"{humidity}%",
                "rainfall": rainfall,
                "condition": condition,
                "wind_speed": f"{wind_speed} m/s",
                "location": resolved_location
          },
          "recommendation": recommendation_text
        })

    except Exception as e:
        print("FULL ERROR:", str(e))

        return jsonify({
            "status": "error",
            "message": f"Failed to retrieve crop recommendation: {str(e)}"
        }), 500
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
