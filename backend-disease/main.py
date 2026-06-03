from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor
from transformers import AutoModelForImageClassification
from PIL import Image
import torch
import io
import os
import asyncio
from dotenv import load_dotenv
import requests
try:
    from groq import Groq
except ImportError:
    Groq = None
from pydantic import BaseModel


# Load environment variables
load_dotenv()

app = FastAPI(title="AgroVision Disease Detection API")
print("Loading MobileNet Plant Disease Model...")

processor = AutoImageProcessor.from_pretrained(
"linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
)

model = AutoModelForImageClassification.from_pretrained(
"linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
)

model.eval()

print("Model loaded successfully")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client for treatment generation only
api_key = os.getenv("GROQ_API_KEY")

client = None
if Groq is not None and api_key:
    try:
        client = Groq(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Groq client: {e}")
else:
    if api_key and Groq is None:
        print("Groq package is not installed; treatment endpoint is disabled.")

class TreatmentRequest(BaseModel):
    disease: str

class CropRecommendationRequest(BaseModel):
    location: str | None = None
    lat: float | None = None
    lon: float | None = None    

@app.get("/")
def read_root():
    return {"name": "AgroVision Disease Detection API", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "treatment_configured": client is not None
    }

def format_label(label: str) -> str:
    if not isinstance(label, str):
        return str(label)
    cleaned = label.replace('___', ' - ').replace('_', ' ')
    return cleaned.title()


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    print("NEW VERSION DEPLOYED")
    try:
        image_bytes = await file.read()

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        print("Incoming image size:", image.size, "mode:", image.mode)

        inputs = processor(images=image, return_tensors="pt")

        with torch.no_grad():
            outputs = model(**inputs)

        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]

        topk = torch.topk(probs, k=min(3, probs.shape[-1]))
        top_indices = topk.indices.tolist()
        top_probs = topk.values.tolist()

        predicted_idx = top_indices[0]
        disease = format_label(model.config.id2label[predicted_idx])
        confidence = round(top_probs[0] * 100, 2)

        top_predictions = [
            {
                "index": int(idx),
                "label": format_label(model.config.id2label[int(idx)]),
                "confidence": round(float(prob) * 100, 2),
            }
            for idx, prob in zip(top_indices, top_probs)
        ]

        crop_type = disease.split(' - ')[0].split(' ')[0] if disease else 'Plant'

        print("Predicted Index:", predicted_idx)
        print("Predicted Class:", disease)
        print("Confidence:", f"{confidence}%")
        print("Model Labels Count:", len(model.config.id2label))
        print("Sample Labels:", list(model.config.id2label.items())[:10])
        print("Top Predictions:")
        for rank, pred in enumerate(top_predictions, start=1):
            print(f"{rank}. {pred['label']} - {pred['confidence']}%")

        return {
            "status": "success",
            "disease": disease,
            "confidence": confidence,
            "cropType": crop_type,
            "topPredictions": top_predictions,
        }

    except Exception as e:
        print("PREDICT ERROR:", repr(e))
        return {
            "status": "error",
            "message": str(e)
       }
@app.post("/treatment")
async def get_treatment(req: TreatmentRequest):

    if not client:
        return {
            "status": "error",
            "message": "Groq client is not configured."
        }

    disease = req.disease.strip()

    if not disease:
        return {
            "status": "error",
            "message": "Disease name is required."
        }

    prompt = f"""
    You are an expert agricultural consultant.

    Disease detected: {disease}

    Provide:

    Organic Treatment
    Fertilizers & Nutrients
    Pesticides / Fungicides
    Watering Advice
    Prevention Tips
    Recovery Timeline

    Keep the answer short, practical and farmer-friendly.
    """

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3
            ),
            timeout=40
        )

        treatment = response.choices[0].message.content

        return {
            "status": "success",
            "disease": disease,
            "treatment": treatment
        }

    except asyncio.TimeoutError:
        return {
            "status": "error",
            "message": "Groq request timed out."
        }

    except Exception as e:
        print("Groq Error:", e)
        return {
            "status": "error",
            "message": str(e)
        }
@app.post("/crop-recommendation")
async def crop_recommendation(req: CropRecommendationRequest):
    # Detailed logging: received fields (using repr for encoding safety)
    print("received city:", repr(req.location))
    print("received latitude:", req.lat)
    print("received longitude:", req.lon)

    if not client:
        err_msg = "Groq client is not configured."
        print("errors:", err_msg)
        return {
            "status": "error",
            "message": err_msg
        }

    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    if not OPENWEATHER_API_KEY:
        err_msg = "OpenWeather API key missing."
        print("errors:", err_msg)
        return {
            "status": "error",
            "message": err_msg
        }

    try:
        weather_url = "https://api.openweathermap.org/data/2.5/weather"
        params = {"appid": OPENWEATHER_API_KEY, "units": "metric"}

        # Use latitude/longitude if coordinates are available
        if req.lat is not None and req.lon is not None:
            params["lat"] = req.lat
            params["lon"] = req.lon
        elif req.location:
            # Trim extra spaces from input
            trimmed_city = req.location.strip()
            params["q"] = trimmed_city
        else:
            err_msg = "Either location or lat/lon coordinates must be provided."
            print("errors:", err_msg)
            return {
                "status": "error",
                "message": err_msg
            }

        response = requests.get(weather_url, params=params)

        # Fallback logic for Indian cities and towns if direct query fails with 404
        if response.status_code == 404 and "q" in params and "," not in params["q"]:
            fallback_city = f"{params['q']},IN"
            print(f"City {repr(params['q'])} not found. Trying Indian city fallback: {repr(fallback_city)}")
            fallback_params = params.copy()
            fallback_params["q"] = fallback_city
            fallback_response = requests.get(weather_url, params=fallback_params)
            if fallback_response.status_code == 200:
                response = fallback_response

        # Detailed logging: OpenWeather response / status
        if response.status_code != 200:
            print("errors: OpenWeather API returned status code", response.status_code)
            print("OpenWeather response (error):", repr(response.text))
            
            if response.status_code == 404:
                return {
                    "status": "error",
                    "message": f"City '{req.location}' not found. Please verify the spelling or try adding country code (e.g., 'Kaikaluru, IN')."
                }
            elif response.status_code == 401:
                return {
                    "status": "error",
                    "message": "Invalid OpenWeather API Key. Please check backend environment configuration."
                }
            else:
                return {
                    "status": "error",
                    "message": f"OpenWeather Error: {response.json().get('message', 'Could not fetch weather data.')}"
                }

        import json
        weather_data = response.json()
        print("OpenWeather response:", json.dumps(weather_data, ensure_ascii=True))

        temperature = weather_data["main"]["temp"]
        humidity = weather_data["main"]["humidity"]
        condition = weather_data["weather"][0]["description"]
        wind_speed = weather_data["wind"]["speed"]
        location = weather_data["name"]

        rain_info = weather_data.get("rain", {})
        rainfall = rain_info.get("1h", rain_info.get("3h", 0))

        prompt = f"""
        You are an agriculture expert.

        Weather:
        Temperature: {temperature}°C
        Humidity: {humidity}%
        Condition: {condition}
        Wind Speed: {wind_speed} m/s
        Location: {location}

        Suggest:
        1. Best crops
        2. Why suitable
        3. Water requirements
        4. Farming risks

        Keep answer short and farmer-friendly.
        """

        groq_response = await asyncio.to_thread(
            client.chat.completions.create,
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )

        recommendation = groq_response.choices[0].message.content

        return {
            "status": "success",
            "weather": {
                "temperature": temperature,
                "humidity": humidity,
                "rainfall": rainfall,
                "condition": condition,
                "wind_speed": wind_speed,
                "location": location,
                "lat": weather_data.get("coord", {}).get("lat"),
                "lon": weather_data.get("coord", {}).get("lon")
            },
            "recommendation": recommendation
        }

    except Exception as e:
        print("errors in crop recommendation:", repr(e))
        return {
            "status": "error",
            "message": str(e)
        }    


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))