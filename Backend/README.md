# CampusSentinal Backend

Django REST Framework backend for campus surveillance and activity tracking system with AI-powered predictions and analytics.

## Overview

A comprehensive backend system for tracking and analyzing campus entity activities through multiple data sources (WiFi logs, CCTV, card swipes, etc.) with AI-powered location prediction and timeline summarization.

## Features

- **JWT Authentication**: Secure user registration and token-based authentication with refresh tokens
- **Multi-Source Activity Tracking**: WiFi logs, CCTV frames, card swipes, lab bookings, library checkouts
- **Face Recognition Integration**: pgvector-based cosine similarity search for face matching
- **AI-Powered Timeline Summarization**: Google Gemini 2.5 Pro for natural language summaries
- **Location Prediction**: Random Forest ML model for next location prediction
- **Real-time Alerts**: Configurable inactivity alerts
- **Advanced Search**: Entity search across multiple identifiers
- **RESTful API**: Comprehensive API for all operations

## Tech Stack

- **Framework**: Django 5.2 + Django REST Framework
- **Authentication**: JWT (Simple JWT) with token refresh and blacklist
- **Database**: PostgreSQL with pgvector extension (Supabase)
- **AI/ML**: 
  - Google Gemini 2.5 Pro (summarization)
  - scikit-learn (location prediction)
- **Vector Search**: pgvector for face embeddings
- **Data Processing**: pandas, numpy

## Prerequisites

- Python 3.10 or higher
- PostgreSQL with pgvector extension (hosted on Supabase)
- Google Gemini API key
- Git

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CampusSentinal/Backend
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
pip install -r requirements.txt
```

### 4. Environment Configuration

Create a `.env` file in the `Backend/` directory with the following variables:

```env
# Database Configuration (Supabase)
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=your_supabase_host.supabase.co
DB_PORT=5432

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```


### 5. Database Setup

**Note:** Database is already hosted on Supabase with pgvector extension enabled. No local setup required.

Verify connection:
```bash
python manage.py dbshell
# Should connect successfully
\q
```



### 6. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

Follow prompts to create admin account.

## Running the Server

### Development Server

```bash
# Make sure you're in Backend/CampusSentinal/
uvicorn CampusSentinal.asgi:application --reload
or 
python manage.py runserver
```

**Server will start at:** `http://localhost:8000`

**Admin Panel:** `http://localhost:8000/admin`




## Project Structure

```
Backend/
├── CampusSentinal/              # Project root
│   ├── __init__.py
│   ├── settings.py              # Django settings
│   ├── urls.py                  # Main URL configuration
│   ├── wsgi.py
│   └── asgi.py
├── api/                         # Main application
│   ├── migrations/              # Database migrations
│   ├── __init__.py
│   ├── models.py                # Database models
│   ├── serializers.py           # DRF serializers
│   ├── views.py                 # API views
│   ├── urls.py                  # API URL routes
│   ├── prediction.py            # ML location prediction
│   ├── explanation.py           # Prediction explanations
│   └── summarizer.py            # Timeline summarization
├── user/                        # User authentication app
│   ├── migrations/              # Database migrations
│   ├── __init__.py
│   ├── models.py                # Custom User model
│   ├── serializers.py           # User serializers
│   ├── views.py                 # Auth views
│   └── urls.py                  # Auth URL routes
├── manage.py                    # Django management script
├── .env                         # Environment variables
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication
Most endpoints require JWT authentication. Include the access token in the Authorization header:

```bash
Authorization: Bearer <your_access_token>
```

**Public endpoints** (no authentication required):
- `POST /users/register/` - User registration
- `POST /users/token/` - Obtain access/refresh tokens

---

### Authentication Endpoints

#### User Registration
```
POST /users/register/
```

**Request Body:**
```json
{
  "email": "alice.johnson@university.edu",
  "password": "securePassword123",
  "first_name": "Alice",
  "last_name": "Johnson"
}
```

**Response (201 CREATED):**
```json
{
  "email": "alice.johnson@university.edu",
  "first_name": "Alice",
  "last_name": "Johnson"
}
```

#### Obtain Token (Login)
```
POST /users/token/
```

**Request Body:**
```json
{
  "email": "alice.johnson@university.edu",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Token Lifetimes:**
- Access Token: 15 minutes
- Refresh Token: 7 days

#### Refresh Access Token
```
POST /users/token/refresh/
```

**Request Body:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** When `ROTATE_REFRESH_TOKENS` is enabled, a new refresh token is returned and the old one is blacklisted.

#### Logout (Blacklist Token)
```
POST /users/token/blacklist/
```

**Request Body:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{}
```

---

### 1. Profile Management

**Authentication Required**: Yes

#### List/Create Profiles
```
GET    /api/profiles/
POST   /api/profiles/
```

#### Profile Details
```
GET    /api/profiles/{entity_id}/
PUT    /api/profiles/{entity_id}/
PATCH  /api/profiles/{entity_id}/
DELETE /api/profiles/{entity_id}/
```

**Example Request:**
```bash
curl "http://localhost:8000/api/profiles/" \
  -H "Authorization: Bearer <your_access_token>"
```

**Example Response:**
```json
{
  "entity_id": "e7f8g9h0",
  "name": "Alice Johnson",
  "role": "student",
  "email": "alice.johnson@university.edu",
  "department": "Computer Science",
  "student_id": "2021CS042",
  "staff_id": null,
  "card_id": "CARD042",
  "face_id": "FACE042",
  "device_hash": "hash_abc123",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

### 2. Entity Search

#### Search Entities
```
GET /api/entities/?q={search_query}
```

Searches across: name, email, card_id, device_hash, face_id, entity_id, student_id, staff_id

**Example Request:**
```bash
curl "http://localhost:8000/api/entities/?q=alice" \
  -H "Authorization: Bearer <your_access_token>"
```

**Example Response:**
```json
[
  {
    "entity_id": "e7f8g9h0",
    "name": "Alice Johnson",
    "role": "student",
    "email": "alice.johnson@university.edu",
    "department": "Computer Science",
    "student_id": "2021CS042",
    "card_id": "CARD042",
    "face_id": "FACE042",
    "device_hash": "hash_abc123",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### 3. Entity Details with Last Seen

#### Get Entity Profile
```
GET /api/entities/{entity_id}/
```

**Example Request:**
```bash
curl "http://localhost:8000/api/entities/e7f8g9h0/" \
  -H "Authorization: Bearer <your_access_token>"
```

**Example Response:**
```json
{
  "entity_id": "e7f8g9h0",
  "name": "Alice Johnson",
  "role": "student",
  "email": "alice.johnson@university.edu",
  "department": "Computer Science",
  "student_id": "2021CS042",
  "staff_id": null,
  "card_id": "CARD042",
  "face_id": "FACE042",
  "device_hash": "hash_abc123",
  "created_at": "2024-01-15T10:30:00Z",
  "last_seen": "2024-10-08T14:30:00Z"
}
```

---

### 4. Alerts System

#### Get Inactive Entities
```
GET /api/alerts/?hours={threshold_hours}
```

**Query Parameters:**
- `hours` (optional): Inactivity threshold in hours (default: 12)

**Example Request:**
```bash
curl "http://localhost:8000/api/alerts/?hours=24" \
  -H "Authorization: Bearer <your_access_token>"
```

**Example Response:**
```json
{
  "alerts": [
    {
      "entity_id": "e7f8g9h0",
      "name": "Alice Johnson",
      "email": "alice.johnson@university.edu",
      "last_seen": "2024-10-07T10:30:00Z",
      "alert": "No observation for > 24 hours"
    }
  ],
  "count": 1
}
```

---

### 5. Timeline & Summarization

#### Get Entity Timeline
```
GET /api/entities/{entity_id}/timeline/?date={YYYY-MM-DD}&types={event_types}
```

**Query Parameters:**
- `date` (required): Date in YYYY-MM-DD format
- `types` (optional): Comma-separated event types to filter

**Event Types:**
- `wifi_logs`
- `cctv_frames`
- `card_swipes`
- `lab_booking`
- `library_checkouts`
- `text_notes`

**Example Request:**
```bash
curl "http://localhost:8000/api/entities/e7f8g9h0/timeline/?date=2024-10-08&types=wifi_logs,card_swipes" \
  -H "Authorization: Bearer <your_access_token>"
```

**Example Response:**
```json
{
  "summary": "- **08:30 AM - 12:00 PM (3 hours 30 minutes)**: Alice started her day at the Computer Science Department building. She stayed here for the morning, likely attending classes or working on projects.\n\n- **12:15 PM - 01:00 PM (45 minutes)**: She then moved to the Central Cafeteria for lunch.\n\n- **01:30 PM - 05:00 PM (3 hours 30 minutes)**: After lunch, Alice went to the Library where she spent the afternoon, probably studying or doing research.",
  "timeline": [
    {
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "event_type": "wifi_logs",
      "timestamp": "2024-10-08T08:30:00Z",
      "location": "CS Building - Floor 2",
      "confidence": 0.95,
      "created_at": "2024-10-08T08:30:05Z",
      "entity": {
        "entity_id": "e7f8g9h0",
        "name": "Alice Johnson",
        "role": "student"
      },
      "wifi_logs": [
        {
          "id": 1,
          "device_hash": "hash_abc123",
          "ap_id": "AP_CS_F2_01",
          "timestamp": "2024-10-08T08:30:00Z"
        }
      ]
    }
  ]
}
```

---

### 6. Face Search

#### Search by Face Embedding
```
POST /api/search/face/
```

**Request Body:**
```json
{
  "embedding": [0.123, -0.456, ..., 0.789]  // 512 floats
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/search/face/" \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"embedding": [0.123, -0.456, ...]}'
```

**Success Response (200 OK):**
```json
{
  "match": true,
  "profile": {
    "entity_id": "e7f8g9h0",
    "name": "Alice Johnson",
    "role": "student",
    "email": "alice.johnson@university.edu",
    "department": "Computer Science",
    "student_id": "2021CS042",
    "card_id": "CARD042",
    "face_id": "FACE042",
    "device_hash": "hash_abc123",
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

---

### 7. Location Prediction

#### Predict Next Location
```
POST /api/predict/
```

**Request Body:**
```json
{
  "entity_id": "e7f8g9h0"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:8000/api/predict/" \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "e7f8g9h0"}'
```

**Example Response:**
```json
{
  "entity_id": "e7f8g9h0",
  "predicted_location": "Library - Floor 3",
  "explanation": "Based on Alice's recent pattern of visiting the Computer Science building in the morning and the library in the afternoon during weekdays, the model predicts she will likely be at the Library - Floor 3 around 3:00 PM, as this matches her typical afternoon study routine.",
  "past_activities": [
    {
      "timestamp": "2024-10-08T08:30:00Z",
      "location": "CS Building - Floor 2"
    },
    {
      "timestamp": "2024-10-08T12:15:00Z",
      "location": "Central Cafeteria"
    },
    {
      "timestamp": "2024-10-08T13:30:00Z",
      "location": "Library - Floor 3"
    }
  ]
}
```

**Error Response (404 NOT FOUND):**
```json
{
  "error": "No location data found for this entity"
}
```

---

## Database Models

### User
Custom user model for authentication.

**Fields:**
- `email` (PK): Email address (used for login)
- `first_name`: First name
- `last_name`: Last name
- `is_staff`: Staff status
- `is_active`: Active status
- `date_joined`: Registration date

### Profile
Primary entity model storing user information.

**Fields:**
- `entity_id` (PK): Unique identifier
- `name`: Full name
- `role`: student/faculty/staff
- `email`: Email address
- `department`: Department name
- `student_id`: Student ID (XOR with staff_id)
- `staff_id`: Staff/Faculty ID (XOR with student_id)
- `card_id`: RFID card identifier
- `face_id`: Face identifier
- `device_hash`: Device MAC hash
- `created_at`: Creation timestamp

### Event
Base event model for all activities.

**Fields:**
- `event_id` (PK, UUID): Unique event identifier
- `entity` (FK): Reference to Profile
- `location`: Location name
- `timestamp`: Event timestamp
- `confidence`: Confidence score (0-1)
- `event_type`: Type of event
- `created_at`: Creation timestamp

### WifiLogs
WiFi connection events.

**Fields:**
- `event` (FK): Reference to Event
- `device_hash`: Device MAC hash
- `ap_id`: Access Point ID
- `timestamp`: Connection timestamp

### CardSwipe
RFID card swipe events.

**Fields:**
- `event` (FK): Reference to Event
- `card_id`: Card identifier
- `location_id`: Reader location
- `timestamp`: Swipe timestamp

### CCTVFrame
CCTV detection events.

**Fields:**
- `frame_id` (PK): Frame identifier
- `event` (FK): Reference to Event
- `location_id`: Camera location
- `timestamp`: Detection timestamp
- `face_id`: Detected face ID

### Note
Text notes/observations.

**Fields:**
- `note_id` (PK): Note identifier
- `event` (FK): Reference to Event
- `entity` (FK): Reference to Profile
- `category`: Note category
- `text`: Note content
- `timestamp`: Note timestamp

### LabBooking
Lab booking records.

**Fields:**
- `booking_id` (PK): Booking identifier
- `event` (FK): Reference to Event
- `entity` (FK): Reference to Profile
- `room_id`: Lab room ID
- `start_time`: Booking start
- `end_time`: Booking end
- `attended`: Attendance status

### LibraryCheckout
Library book checkouts.

**Fields:**
- `checkout_id` (PK): Checkout identifier
- `event` (FK): Reference to Event
- `entity` (FK): Reference to Profile
- `book_id`: Book identifier
- `timestamp`: Checkout timestamp

### FaceEmbedding
Face embeddings for recognition.

**Fields:**
- `face_id` (PK): Face identifier
- `profile` (FK): Reference to Profile
- `embedding`: 512-dimensional vector (pgvector)
- `embedding_model`: Model name

---

## AI/ML Features

### 1. Timeline Summarization

**Technology:** Google Gemini 2.5 Pro

**Process:**
1. Fetches all events for entity in date range
2. Converts to human-readable timeline
3. Sends to Gemini with custom prompt
4. Returns natural language summary

**Example Prompt:**
```
You are an assistant that summarizes a person's daily activity timeline.
Write a short, easy-to-understand summary that sounds like someone naturally describing the day.
...
```

### 2. Location Prediction

**Technology:** Random Forest Classifier (scikit-learn)

**Features:**
- `hour`: Hour of day (0-23)
- `day_of_week`: Day (0=Monday, 6=Sunday)
- `is_weekend`: Weekend flag (0/1)

**Process:**
1. Extracts temporal features from historical data
2. Trains Random Forest on location patterns
3. Predicts next location for future timestamp
4. Generates explanation via Gemini

**Prediction Logic:**
```python
# Train on past events
X = [hour, day_of_week, is_weekend]
y = location_encoded

model.fit(X, y)

# Predict 1 hour ahead
future_time = now + 1 hour
prediction = model.predict(future_features)
```

---

## Configuration

### JWT Settings

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

### CORS Settings

Configured for frontend at `http://localhost:3000`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

### Time Zone

```python
TIME_ZONE = 'Asia/Kolkata'
USE_TZ = True
```

### Database Connection Pooling

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}
```

---

## Testing

### Manual API Testing

```bash
# Register a new user
curl -X POST "http://localhost:8000/users/register/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.edu",
    "password": "testPassword123",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login to get tokens
curl -X POST "http://localhost:8000/users/token/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@university.edu
