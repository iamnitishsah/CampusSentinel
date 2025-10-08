# CampusSentinal AI Service

Face identification microservice using FaceNet (InceptionResnetV1) for real-time face embedding generation and identity verification.

## Overview

This FastAPI-based service generates 512-dimensional face embeddings from uploaded images and forwards them to the Django backend for identity matching against the database.

## Features

- **Face Embedding Generation**: Converts face images into 512-dimensional vectors using InceptionResnetV1 (VGGFace2)
- **Real-time Processing**: Fast inference with PyTorch
- **REST API**: Simple HTTP endpoint for face identification
- **CORS Enabled**: Ready for frontend integration
- **Error Handling**: Comprehensive error responses

## Tech Stack

- **FastAPI**: High-performance web framework
- **PyTorch**: Deep learning framework
- **facenet-pytorch**: Pre-trained face recognition models
- **Pillow (PIL)**: Image processing
- **torchvision**: Image transformations

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CampusSentinal/AI
```

### 2. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install fastapi uvicorn torch torchvision facenet-pytorch pillow python-multipart requests
```



### 4. Environment Configuration

Create a `.env` file in the `AI/` directory:

```env
DRF_SEARCH_URL=http://127.0.0.1:8000/api/search/face/
```

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `DRF_SEARCH_URL` | Django backend face search endpoint | `http://127.0.0.1:8000/api/search/face/` |

## Running the Service

### Development Server

```bash
# Make sure you're in the AI/ directory
cd AI

# Start the FastAPI server
uvicorn face_embedding:app --reload --host 0.0.0.0 --port 8001
```

**Server will start at:** `http://localhost:8001`

**API Documentation:** `http://localhost:8001/docs` (Swagger UI)



## API Documentation

### Base URL
```
http://localhost:8001
```

### Endpoints

#### 1. Identify and Search Face

**Endpoint:** `POST /identify-and-search/`

Accepts a face image, generates embedding, and searches for matches in the database.

**Request:**
- **Method:** POST
- **Content-Type:** `multipart/form-data`
- **Body:** Form-data with `file` field containing the image

**cURL Example:**
```bash
curl -X POST "http://localhost:8001/identify-and-search/" \
  -H "accept: application/json" \
  -F "file=@/path/to/face_image.jpg"
```


**JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('http://localhost:8001/identify-and-search/', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**Success Response (200 OK):**
```json
{
  "match": true,
  "profile": {
    "entity_id": "abc123xyz",
    "name": "John Doe",
    "role": "student",
    "email": "john.doe@university.edu",
    "department": "Computer Science",
    "student_id": "2021CS001",
    "card_id": "CARD001",
    "face_id": "FACE001",
    "device_hash": "hash123",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "distance": 0.23
}
```

**No Match Response (404 NOT FOUND):**
```json
{
  "match": false,
  "detail": "No confident match found."
}
```

**Error Responses:**

| Status Code | Description | Response |
|-------------|-------------|----------|
| 400 | Invalid image format | `{"detail": "Could not process image: ..."}` |
| 500 | Model not loaded | `{"detail": "Model is not available."}` |
| 503 | Backend unreachable | `{"detail": "Service Unavailable: Could not connect to DRF backend. ..."}` |

## How It Works

### Processing Pipeline

1. **Image Upload**: Client uploads face image via POST request
2. **Image Preprocessing**: 
   - Resize to 160x160 pixels
   - Convert to RGB
   - Normalize pixel values to [-1, 1]
3. **Embedding Generation**: InceptionResnetV1 model generates 512-dimensional vector
4. **Backend Communication**: Embedding sent to Django backend
5. **Identity Matching**: Backend performs cosine similarity search in pgvector database
6. **Response**: Profile data returned if match found (distance < 0.4)

### Model Details

- **Architecture**: InceptionResnetV1
- **Pre-training**: VGGFace2 dataset
- **Output**: 512-dimensional face embedding
- **Matching Threshold**: Cosine distance < 0.4

### Image Requirements

- **Format**: JPEG, PNG, or any PIL-supported format
- **Content**: Clear frontal face image
- **Recommended Size**: At least 160x160 pixels
- **Quality**: Good lighting, minimal occlusion

## Project Structure

```
AI/
├── face_embedding.py      # Main FastAPI application
├── .env                   # Environment variables
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Error Handling

The service includes comprehensive error handling:

- **Invalid Image**: Returns 400 with error details
- **Model Loading Failure**: Returns 500 on startup
- **Backend Communication Error**: Returns 503 with connection details
- **Timeout**: 10-second timeout for backend requests

## Performance Considerations

- **Model Loading**: Model loads once on startup
- **Inference Time**: ~100-200ms per image on CPU
- **GPU Acceleration**: Automatic if CUDA available
- **Memory Usage**: ~500MB for model

## CORS Configuration

Pre-configured CORS for development:

```python
allow_origins=["http://localhost:3000", "*"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

**Production:** Update `allow_origins` to specific frontend domains.

## Troubleshooting

### Common Issues

**1. Model Download Error**
```
Error loading: HTTPError...
```
**Solution:** Check internet connection. Model downloads automatically from PyTorch Hub (~110MB).

**2. Import Error: torch not found**
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

**3. Backend Connection Error**
```
Service Unavailable: Could not connect to DRF backend
```
**Solution:** Ensure Django backend is running on port 8000.

**4. Port Already in Use**
```bash
# Change port
uvicorn face_embedding:app --reload --port 8002
```

## Testing

### Manual Testing

```bash
# Test with cURL
curl -X POST "http://localhost:8001/identify-and-search/" \
  -F "file=@test_face.jpg"
```

### API Documentation UI

Visit `http://localhost:8001/docs` for interactive API testing.

## Dependencies Version Matrix

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.104.1 | Web framework |
| uvicorn | 0.24.0 | ASGI server |
| torch | 2.1.0 | Deep learning |
| torchvision | 0.16.0 | Image transforms |
| facenet-pytorch | 2.5.3 | Face recognition |
| pillow | 10.1.0 | Image processing |
| requests | 2.31.0 | HTTP client |

## Integration with Backend

The AI service communicates with the Django backend via the `/api/search/face/` endpoint:

**Request to Backend:**
```json
{
  "embedding": [0.123, -0.456, ..., 0.789]  // 512 floats
}
```

**Response from Backend:**
```json
{
  "match": true,
  "profile": {...},
  "distance": 0.23
}
```


## Support

For issues and questions:
- Create an issue in the repository
- Contact: [+91 8862887291]

---

**Note:** Ensure the Django backend is running before starting this service, as it depends on the backend's face search endpoint.