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
    try:
        image_bytes = await file.read()

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((224, 224))
        print("Image size:", image.size)
        print("Image mode:", image.mode)
        inputs = processor(
            images=image,
            return_tensors="pt"
        )

        with torch.no_grad():
            outputs = model(**inputs)

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))