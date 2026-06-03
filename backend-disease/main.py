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
from torchvision import transforms
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

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    print("NEW VERSION DEPLOYED")
    try:
        image_bytes = await file.read()

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            ])

        image_tensor = transform(image).unsqueeze(0)

        with torch.no_grad():
            outputs = model(pixel_values=image_tensor)

        predicted_idx = outputs.logits.argmax(-1).item()

        disease = model.config.id2label[predicted_idx]

        confidence = torch.nn.functional.softmax(
            outputs.logits,
            dim=-1
        )[0][predicted_idx].item()

        confidence = round(confidence * 100, 2)

        crop_type = disease.split("_")[0]

        return {
            "status": "success",
            "disease": disease,
            "confidence": confidence,
            "cropType": crop_type
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

    if not client:
        return {
            "status": "error",
            "message": "Groq client is not configured."
        }

    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

    if not OPENWEATHER_API_KEY:
        return {
            "status": "error",
            "message": "OpenWeather API key missing."
        }

    try:

        weather_url = "https://api.openweathermap.org/data/2.5/weather"

        if req.lat is not None and req.lon is not None:
            params = {
                "lat": req.lat,
                "lon": req.lon,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            }
        else:
            params = {
                "q": req.location,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric"
            }

        response = requests.get(weather_url, params=params)

        if response.status_code != 200:
            print("OPENWEATHER STATUS:", response.status_code)
            print("OPENWEATHER RESPONSE:", response.text)

            return {
                "status": "error",
                "message": "Could not fetch weather data."
            }

        weather_data = response.json()

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
                "location": location
            },
            "recommendation": recommendation
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }    


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))