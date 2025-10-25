# CampusSentinal Backend

Django REST Framework backend for campus surveillance and activity tracking system with AI-powered predictions and analytics.

## Overview

A comprehensive backend system for tracking and analyzing campus entity activities through multiple data sources (WiFi logs, CCTV, card swipes, etc.) with AI-powered location prediction, occupancy forecasting, and timeline summarization.

## Features

- **JWT Authentication**: Secure user registration and token-based authentication with refresh tokens
- **Multi-Source Activity Tracking**: WiFi logs, CCTV frames, card swipes, lab bookings, library checkouts
- **Face Recognition Integration**: pgvector-based cosine similarity search for face matching
- **AI-Powered Timeline Summarization**: Google Gemini 2.5 Flash for natural language summaries
- **Location Prediction**: Random Forest ML model for next location prediction
- **Occupancy Forecasting**: ML-based predictions for campus location occupancy with AI explanations
- **Intelligent Alerts**: AI-enhanced recommendations for missing persons, overcrowding, access violations, and after-hours access
- **Advanced Search**: Entity search across multiple identifiers
- **RESTful API**: Comprehensive API for all operations

## Tech Stack

- **Framework**: Django 5.2 + Django REST Framework
- **Authentication**: JWT (Simple JWT) with token refresh and blacklist
- **Database**: PostgreSQL with pgvector extension (Supabase)
- **AI/ML**: 
  - Google Gemini 2.5 Flash & 2.0 Flash (summarization & explanations)
  - scikit-learn (location & occupancy prediction)
- **Vector Search**: pgvector for face embeddings
- **Data Processing**: pandas, numpy
- **AI Integration**: LangChain for structured LLM interactions

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
# or 
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
│   ├── summarizer.py            # Timeline summarization
│   ├── occupancy_predictor.py   # Single location occupancy ML
│   ├── all_occupancy_predictor.py  # Batch occupancy predictions
│   ├── occupancy_explainer.py   # AI-powered occupancy explanations
│   └── ActionRecommendation.py  # LLM-based alert recommendations
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

---

### 3. Entity Details with Last Seen

#### Get Entity Profile
```
GET /api/entities/{entity_id}/
```

**Example Response:**
```json
{
  "entity_id": "e7f8g9h0",
  "name": "Alice Johnson",
  "role": "student",
  "email": "alice.johnson@university.edu",
  "department": "Computer Science",
  "last_seen": "2024-10-08T14:30:00Z"
}
```

---

### 4. Intelligent Alerts System

#### Get Campus Alerts with AI Recommendations
```
GET /api/alerts/?hours={threshold_hours}
```

**Query Parameters:**
- `hours` (optional): Inactivity threshold for missing person alerts (default: 10)

**Features:**
- Missing Person detection (excludes sleeping hours: 12 AM - 7 AM)
- Overcrowding detection (based on location capacity)
- Access Violation detection (unauthorized area access)
- After Hours Access detection (10 PM - 7 AM)
- AI-powered recommendations via Google Gemini 2.0 Flash

**Example Response:**
```json
{
  "alerts": [
    {
      "alert_type": "Missing Person",
      "severity": 10,
      "message": "Alice Johnson had no activity for 15.5 hours...",
      "details": {
        "entity_id": "e7f8g9h0",
        "name": "Alice Johnson",
        "gap_start": "2024-10-07T10:30:00Z",
        "gap_end": "2024-10-08T09:00:00Z",
        "gap_hours": 15.5,
        "total_gap_hours": 22.5
      },
      "recommendation": "Contact emergency contacts immediately and review security footage from the last known location. Check with roommates and classmates for any information.",
      "llm_recommendation": "Contact emergency contacts immediately and review security footage from the last known location. Check with roommates and classmates for any information."
    },
    {
      "alert_type": "Overcrowding",
      "severity": 7,
      "message": "Library was over capacity by 125% at 2024-10-08 14:30.",
      "details": {
        "location_name": "Library",
        "current_count": 4837,
        "max_capacity": 2150,
        "timestamp": "2024-10-08T14:30:00Z"
      },
      "recommendation": "Implement immediate crowd control measures by opening additional library wings and creating overflow study spaces in nearby seminar rooms.",
      "llm_recommendation": "Implement immediate crowd control measures by opening additional library wings and creating overflow study spaces in nearby seminar rooms."
    },
    {
      "alert_type": "Access Violation",
      "severity": 7,
      "message": "John Doe (student) entered restricted area: Faculty Office.",
      "details": {
        "entity_id": "a1b2c3d4",
        "name": "John Doe",
        "role": "student",
        "location": "Faculty Office",
        "timestamp": "2024-10-08T11:45:00Z"
      },
      "recommendation": "Contact campus security to verify the individual's credentials and reason for access. Dispatch security personnel if unauthorized.",
      "llm_recommendation": "Contact campus security to verify the individual's credentials and reason for access. Dispatch security personnel if unauthorized."
    }
  ],
  "count": 3,
  "recommendations_summary": {
    "Missing Person": "Contact emergency contacts immediately...",
    "Overcrowding": "Implement immediate crowd control measures...",
    "Access Violation": "Contact campus security to verify..."
  }
}
```

**Alert Types & Severity:**
- Missing Person: Severity 10 (Critical)
- Overcrowding: Severity 5-8 (based on overage %)
- Access Violation: Severity 7 (High)
- After Hours Access: Severity 6 (Medium-High)

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
- `wifi_logs`, `cctv_frames`, `card_swipes`, `lab_booking`, `library_checkouts`, `text_notes`

**Example Response:**
```json
{
  "summary": "- **08:30 AM - 12:00 PM (3 hours 30 minutes)**: Alice started her day at the Computer Science Department building...",
  "timeline": [
    {
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "event_type": "wifi_logs",
      "timestamp": "2024-10-08T08:30:00Z",
      "location": "CS Building - Floor 2",
      "confidence": 0.95,
      "wifi_logs": [...]
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

**Success Response (200 OK):**
```json
{
  "match": true,
  "profile": {
    "entity_id": "e7f8g9h0",
    "name": "Alice Johnson",
    "role": "student",
    "email": "alice.johnson@university.edu"
  },
  "distance": 0.23
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

**Example Response:**
```json
{
  "entity_id": "e7f8g9h0",
  "predicted_location": "Library - Floor 3",
  "explanation": "Based on Alice's recent pattern of visiting the Computer Science building in the morning and the library in the afternoon during weekdays, the model predicts she will likely be at the Library - Floor 3 around 3:00 PM...",
  "past_activities": [
    {
      "timestamp": "2024-10-08T08:30:00Z",
      "location": "CS Building - Floor 2"
    }
  ]
}
```

---

### 8. Occupancy Forecasting (NEW)

#### Predict Occupancy for Single Location
```
POST /api/forecast/
```

**Request Body:**
```json
{
  "location_id": "Library",
  "future_time": "2024-10-25T14:30:00Z"
}
```

**Features:**
- Random Forest Regressor trained on historical occupancy data
- Time-based features: hour, day of week, week of year, time period
- AI-powered explanation via Google Gemini 2.5 Flash
- Status classification: Normal, Overcrowded, Underused

**Example Response:**
```json
{
  "location_name": "Library",
  "future_time": "2024-10-25T14:30:00",
  "predicted_occupancy": 1847,
  "status": "Normal",
  "explanation": "From previous data, I see that Library is bustling with activity during this time. The predicted value is 1847 people because Thursday afternoons typically see high student traffic as many prefer studying in the library after morning classes. This afternoon period on weekdays consistently shows elevated occupancy as students gather for group study sessions and individual research work, making it one of the busiest times at this location."
}
```

**Status Thresholds:**
- **Overcrowded**: > 90% of max capacity
- **Normal**: 30% - 90% of max capacity
- **Underused**: < 30% of max capacity

**Supported Locations:**
- Admin Lobby (710)
- Auditorium (1360)
- Hostel (5000)
- LAB_102 (15)
- LAB (30)
- Library (2150)
- Seminar Room (1800)
- WORKSHOP (20)
- LAB_305 (30)
- Gym (1012)
- LAB_101 (40)
- Cafeteria (1360)
- LAB_A2 (12)
- LAB_A1 (20)
- Main Building (30)
- Faculty Office (650)

---

#### Predict Occupancy for All Locations (Batch)
```
POST /api/forecast-all/
```

**Request Body:**
```json
{
  "future_time": "2024-10-25T14:30:00Z"
}
```

**Features:**
- Optimized batch prediction for all campus locations
- Single model initialization for efficiency
- Real-time capacity status for each location

**Example Response:**
```json
[
  {
    "location_name": "Library",
    "predicted_occupancy": 1847,
    "status": "Normal"
  },
  {
    "location_name": "Cafeteria",
    "predicted_occupancy": 1523,
    "status": "Overcrowded"
  },
  {
    "location_name": "Gym",
    "predicted_occupancy": 234,
    "status": "Underused"
  },
  {
    "location_name": "LAB_305",
    "predicted_occupancy": 18,
    "status": "Normal"
  }
]
```

**Use Cases:**
- Dashboard overview of campus occupancy
- Real-time capacity monitoring
- Space utilization analytics
- Crowd management planning

---

## Database Models

### Core Models

#### User
Custom user model for authentication with email as username.

#### Profile
Primary entity model storing user information and identifiers.

#### Event
Base event model linking all activity types.

#### OccupancyData (NEW)
Historical occupancy records for ML training.

**Fields:**
- `location_id`: Location identifier
- `start_time`: Timestamp of occupancy count
- `count`: Number of people at location

**Indexes:**
- `(location_id, start_time)` for efficient queries
- Unique constraint on `(location_id, start_time)`

### Activity Models

- **WifiLogs**: WiFi connection events
- **CardSwipe**: RFID card swipe events
- **CCTVFrame**: CCTV detection events
- **Note**: Text notes/observations
- **LabBooking**: Lab booking records
- **LibraryCheckout**: Library book checkouts
- **FaceEmbedding**: Face embeddings for recognition (512D pgvector)

---

## AI/ML Features

### 1. Timeline Summarization
**Technology:** Google Gemini 2.5 Flash  
**Purpose:** Convert event sequences into natural language summaries

### 2. Location Prediction
**Technology:** Random Forest Classifier  
**Features:** hour, day_of_week, is_weekend  
**Purpose:** Predict entity's next location based on patterns

### 3. Occupancy Forecasting (NEW)
**Technology:** Random Forest Regressor  
**Features:** 
- Temporal: year, month, day, hour, minute, day_of_week, week_of_year
- Derived: is_weekend, time_in_minutes, time_period (Night/Morning/Afternoon/Evening)

**Process:**
```python
# Extract time features
hour, day_of_week, is_weekend, time_period, etc.

# Train Random Forest
model = RandomForestRegressor(n_estimators=100, max_depth=15)
model.fit(X_train, y_train)

# Predict future occupancy
predicted_count = model.predict(future_features)
```

### 4. Occupancy Explanations (NEW)
**Technology:** Google Gemini 2.5 Flash  
**Purpose:** Generate human-readable explanations for occupancy predictions

**Features:**
- Analyzes historical patterns (same hour, same day of week)
- Provides narrative explanations without numerical comparisons
- Contextualizes predictions with time period insights

### 5. Intelligent Alert Recommendations (NEW)
**Technology:** LangChain + Google Gemini 2.0 Flash  
**Purpose:** Generate actionable, context-aware recommendations for alerts

**Alert-Specific Prompting:**
- Missing Person: Checks last known location, emergency contacts, security footage
- Overcrowding: Suggests crowd control, additional entry points, scheduling changes
- Access Violation: Recommends security contact, entity verification
- After Hours Access: Suggests reaching out to entity, on-site verification

**Implementation:**
```python
# LangChain LCEL pipeline
chain = prompt | llm | StrOutputParser()

# Context preparation
context = prepare_context(alert_type, alerts)

# Generate recommendation
recommendation = chain.invoke({
    "alert_type": alert_type,
    "count": len(alerts),
    "context": context
})
```

---

## Configuration

### Location Capacity Mapping
```python
LOCATION_MAX_CAPACITY = {
    'Library': 2150,
    'Cafeteria': 1360,
    'Gym': 1012,
    'Hostel': 5000,
    # ... 16 total locations
}
```

### Access Control Rules
```python
ACCESS_RULES = {
    'Faculty Office': ['faculty', 'staff'],
    'LAB_305': ['faculty', 'student'],
    'Hostel': ['student'],
    'Library': ['faculty', 'staff', 'student']
}
```

### JWT Settings
```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
```

### Time Zone
```python
TIME_ZONE = 'Asia/Kolkata'
USE_TZ = True
```

---

## Testing

### Test Occupancy Prediction (Single Location)
```bash
curl -X POST "http://localhost:8000/api/forecast/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "Library",
    "future_time": "2024-10-25T14:30:00Z"
  }'
```

### Test Batch Occupancy Prediction
```bash
curl -X POST "http://localhost:8000/api/forecast-all/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "future_time": "2024-10-25T14:30:00Z"
  }'
```

### Test Alert System
```bash
curl "http://localhost:8000/api/alerts/?hours=24" \
  -H "Authorization: Bearer <token>"
```

---

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "error": "location_id is required"
}
```

**404 Not Found:**
```json
{
  "error": "No historical occupancy data found for location: InvalidLocation"
}
```

**500 Internal Server Error:**
```json
{
  "error": "An internal server error occurred: <details>"
}
```

---

## Performance Optimizations

1. **Batch Predictions**: `forecast-all` endpoint uses single model initialization for all locations
2. **Database Indexing**: Optimized indexes on `(location_id, start_time)` for occupancy queries
3. **Query Optimization**: Prefetch related entities for timeline queries
4. **Async Processing**: Timeline summarization uses async/await for concurrent operations

---

## Environment Variables

Required in `.env`:
```env
# Database (Supabase)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=your_project.supabase.co
DB_PORT=5432

# AI Services
GEMINI_API_KEY=your_gemini_api_key
```

---

## Troubleshooting

### Gemini API Issues
- Verify `GEMINI_API_KEY` is set in `.env`
- Check API quota and rate limits
- System falls back to generic messages if LLM unavailable

### Database Connection
- Ensure Supabase credentials are correct
- Check network connectivity
- Verify pgvector extension is enabled

### Missing Predictions
- Ensure historical data exists for the location
- Check datetime format (ISO 8601)
- Verify location_id matches exact name in `LOCATION_MAX_CAPACITY`

---

## Future Enhancements

- [ ] Real-time occupancy streaming
- [ ] Anomaly detection for unusual patterns
- [ ] Multi-location route optimization
- [ ] Predictive maintenance alerts
- [ ] Integration with building management systems

---

## License

[Your License Here]

## Contributors

[Your Team/Contributors Here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@campussentinal.edu