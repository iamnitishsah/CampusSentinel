import torch
import requests
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from facenet_pytorch import InceptionResnetV1
from PIL import Image
from torchvision import transforms
import io
import os

app = FastAPI(title="Face Identification Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DRF_SEARCH_URL = os.environ.get("DRF_SEARCH_URL", "http://127.0.0.1:8000/api/search/face/")


try:
    face_model = InceptionResnetV1(pretrained='vggface2').eval()
    print("vggface2 loaded.")
except Exception as e:
    print(f"Error loading: {e}")
    face_model = None


transform = transforms.Compose([
    transforms.Resize((160, 160)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])


def get_embedding_from_image(image_bytes: bytes) -> list:
    if not face_model:
        raise HTTPException(status_code=500, detail="Model is not available.")

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_tensor = transform(img).unsqueeze(0)
        with torch.no_grad():
            embedding = face_model(img_tensor)
        return embedding.squeeze().tolist()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {e}")

@app.post("/identify-and-search/")
async def identify_and_search(file: UploadFile = File(...)):
    image_bytes = await file.read()

    embedding_list = get_embedding_from_image(image_bytes)

    payload = {"embedding": embedding_list}

    try:
        response = requests.post(DRF_SEARCH_URL, json=payload, timeout=10)
        response.raise_for_status()

        return response.json()

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service Unavailable: Could not connect to DRF backend. {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")


if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server...")
    uvicorn.run("face_embedding:app", host="0.0.0.0", port=8001, reload=True)
