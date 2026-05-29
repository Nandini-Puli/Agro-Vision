from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import io
import os
import asyncio
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel
import requests

# Load environment variables
load_dotenv()

app = FastAPI(title="AgroVision Disease Detection API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client for treatment generation only
api_key = os.getenv("GEMINI_API_KEY")
gemini_models = [
    "gemini-2.0-flash",
]
try:
    client = genai.Client(api_key=api_key) if api_key else None
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

class TreatmentRequest(BaseModel):
    disease: str

@app.get("/")
def read_root():
    return {"name": "AgroVision Disease Detection API", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": True,
        "treatment_configured": client is not None
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        api_key = "MiCrWvf28TKtaEKw6ouY"
        model_id = "nandini-puli/plant-disease-zcwgs/1"

        url = f"https://classify.roboflow.com/{model_id}?api_key={api_key}"

        response = requests.post(
            url,
            files={
                "file": ("image.jpg", image_bytes, "image/jpeg")
           }
       )

        data = response.json()

        print("ROBOFLOW RESPONSE:", data)

        predictions = data.get("predictions", {})

        if not predictions:
            return {
                "status": "error",
                "message": f"No disease detected: {data}"
            }

        disease = max(predictions, key=predictions.get)

        confidence = round(predictions[disease] * 100, 2)
        crop_type = disease.split(" ")[0]

        return {
            "status": "success",
            "disease": disease,
            "confidence": confidence,
            "cropType": crop_type
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
       }
@app.post("/treatment")
async def get_treatment(req: TreatmentRequest):
    if not client:
        return {
            "status": "error",
            "message": "Gemini AI client is not configured or available."
        }

    disease = req.disease.strip() if req.disease else ""
    if not disease:
        return {
            "status": "error",
            "message": "Detected disease name is required."
        }
    
    try:
        prompt = f"""
        You are an expert plant pathologist and agricultural consultant AI.
        The user's crop has been diagnosed with the disease: "{disease}".
        
        Suggest a highly effective treatment plan for this disease. 
        Structure your response exactly with these headings:
        - **Organic Treatment**: Natural remedies, biological controls, home remedies.
        - **Fertilizers & Nutrients**: Recommended crop feeding adjustments to boost recovery.
        - **Pesticides / Fungicides**: Chemical recommendations if organic treatments are insufficient.
        - **Watering Advice**: Specific hydration instructions during plant recovery.
        - **Prevention Tips**: Long-term field practices to avoid re-infection.
        - **Recovery Timeline**: How long before visual improvements appear.
        
        Keep the explanation short, practical, easy to understand, and highly farmer-friendly.
        """

        response = None
        last_error = None

        for model_name in dict.fromkeys(gemini_models):
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=prompt
                    ),
                    timeout=40
                )
                break
            except Exception as model_error:
                last_error = model_error

        if response is None:
            print(f"Gemini treatment generation failed: {last_error}")
            return {
                "status": "error",
                "message": "Gemini treatment service is temporarily unavailable."
            }

        treatment = getattr(response, "text", None)
        if not treatment or not treatment.strip():
            return {
                "status": "error",
                "message": "Gemini returned an empty treatment response."
            }

        return {
            "disease": disease,
            "treatment": treatment.strip(),
            "status": "success"
        }

    except asyncio.TimeoutError:
        return {
            "status": "error",
            "message": "Gemini treatment generation timed out."
        }
    except Exception as e:
        print(f"Treatment endpoint error: {e}")
        return {
            "status": "error",
            "message": "Could not generate treatment recommendations right now."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))