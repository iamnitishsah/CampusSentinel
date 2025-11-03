# 🏫 CampusSentinel
## 🔍 Cross-Source Entity Resolution & Predictive Security Monitoring

### By ChaosCoded
<p align="center">
  <img src="https://github.com/iamnitishsah/CampusSentinel/blob/main/Sanchita%20Certificate.jpg?raw=true" alt="IIT-ISM Certificate" width="600"/>
</p>
<p align="center">
  <img src="https://github.com/iamnitishsah/CampusSentinel/blob/main/Ethos%20Certificate.jpg?raw=true" alt="IIT-ISM Certificate" width="600"/>
</p>

This repository contains the complete source code for **CampusSentinel**, an integrated system for intelligent campus security and monitoring with AI-powered predictions, occupancy forecasting, and real-time alerts.

For detailed setup and configuration, please refer to the README files inside each module.

---

## 🌟 Key Features

### 🔐 Security & Monitoring
- **Multi-Source Activity Tracking**: WiFi logs, CCTV frames, card swipes, lab bookings, library checkouts
- **Face Recognition**: pgvector-based cosine similarity search for instant identity matching
- **Intelligent Alerts**: AI-enhanced recommendations for missing persons, overcrowding, access violations, and after-hours access

### 🤖 AI-Powered Intelligence
- **Location Prediction**: Random Forest ML model predicts entity's next location based on behavioral patterns
- **Occupancy Forecasting**: Real-time predictions for all campus locations with capacity status
- **Timeline Summarization**: Natural language summaries of daily activities via Google Gemini
- **Smart Recommendations**: Context-aware, actionable suggestions for security alerts

### 📊 Analytics & Insights
- **Real-time Dashboard**: Comprehensive view of campus activities and occupancy
- **Predictive Analytics**: Forecast crowd patterns and potential security concerns
- **Historical Analysis**: Track patterns and trends across time periods
- **Capacity Management**: Monitor and optimize space utilization across 16+ locations

---

## 🧩 Project Modules

The project is divided into three main modules:

### 🖥️ Frontend
User interface for monitoring, visualization, and interaction.
- Real-time occupancy dashboard with live predictions
- Interactive entity timeline with AI summaries
- Face recognition search interface
- Alert management with AI recommendations
- Location prediction visualization

📁 **Documentation**: `/Frontend/README.md`

### ⚙️ Backend
Core logic, API services, and database management using **Django REST Framework (DRF)**.
- JWT Authentication with token refresh
- RESTful API for all operations
- PostgreSQL with pgvector extension (Supabase)
- ML models for location & occupancy prediction
- Google Gemini integration for AI features
- LangChain for structured LLM interactions

📁 **Documentation**: `/Backend/README.md`

> **Environment Variables:** `.env` file required for backend configuration:  


**Required Environment Variables:**
```env
# Database
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=your_db_host
DB_PORT=5432

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### 🤖 AI
Machine learning and facial recognition pipelines for predictive analytics and cross-source entity resolution.
- Face embedding generation (InceptionResnetV1)
- Entity resolution across multiple data sources
- Behavioral pattern analysis
- Anomaly detection capabilities

📁 **Documentation**: `/AI/README.md`

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL with pgvector (Supabase)
- Google Gemini API key

### Setup Order

1. **Backend First** (Core Services)
   ```bash
   cd Backend/CampusSentinal
   pip install -r requirements.txt
   # Configure .env file
   python manage.py runserver
   ```

2. **AI Module** (Optional, for data processing)
   ```bash
   cd AI
   pip install -r requirements.txt
   # Run face recognition & data pipelines
   ```

3. **Frontend** (User Interface)
   ```bash
   cd Frontend
   npm install
   npm start
   ```

**Servers:**
- Backend API: `http://localhost:8000`
- Frontend UI: `http://localhost:3000`

---

## 📊 System Architecture

```
┌─────────────────┐
│    Frontend     │  React + Material-UI
│  (Port 3000)    │  - Dashboard & Visualization
└────────┬────────┘  - Real-time Monitoring
         │
         ▼
┌─────────────────┐
│   Backend API   │  Django REST Framework
│  (Port 8000)    │  - JWT Authentication
└────────┬────────┘  - ML Predictions
         │           - AI Integration
         ├──────────────────────┐
         ▼                      ▼
┌─────────────────┐    ┌──────────────┐
│   PostgreSQL    │    │   Gemini AI  │
│   + pgvector    │    │   LangChain  │
│   (Supabase)    │    └──────────────┘
└─────────────────┘
```

---

## 🎯 Core Capabilities

### 1. Predictive Occupancy Forecasting
Forecast occupancy for 16+ campus locations using Random Forest ML models:
- **Locations**: Library, Cafeteria, Gym, Labs, Auditorium, Hostel, and more
- **Status**: Normal, Overcrowded, Underused
- **Single Location**: `/api/forecast/` - Detailed prediction with AI explanation
- **Batch Mode**: `/api/forecast-all/` - All locations at once for dashboard

### 2. Intelligent Alert System
AI-powered alerts with actionable recommendations:
- **Missing Person**: Detects extended absences (excludes sleeping hours)
- **Overcrowding**: Monitors capacity violations in real-time
- **Access Violation**: Flags unauthorized area access
- **After Hours Access**: Tracks late-night facility usage

Each alert includes context-aware recommendations via Google Gemini 2.0 Flash.

### 3. Location Prediction
Predict entity's next location based on historical patterns:
- Analyzes temporal features (hour, day, weekend)
- Provides natural language explanations
- Displays past activity timeline

### 4. Timeline Summarization
Convert raw event data into human-readable narratives:
- Daily activity summaries
- Time spent at each location
- Natural language descriptions

### 5. Face Recognition Search
Instant identity matching using pgvector:
- 512-dimensional face embeddings
- Cosine similarity search
- Sub-second query response

---

## 📈 API Highlights

### Authentication
```bash
POST /users/register/     # User registration
POST /users/token/        # Login (get JWT)
POST /users/token/refresh/ # Refresh access token
```

### Core Features
```bash
GET  /api/entities/       # Search entities
GET  /api/alerts/         # Get intelligent alerts
POST /api/predict/        # Predict next location
POST /api/forecast/       # Forecast occupancy (single)
POST /api/forecast-all/   # Forecast all locations
GET  /api/entities/{id}/timeline/ # Get timeline with AI summary
POST /api/search/face/    # Face recognition search
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Django 5.2 + Django REST Framework
- **Authentication**: JWT (Simple JWT)
- **Database**: PostgreSQL + pgvector
- **AI/ML**: Google Gemini 2.5 Flash, scikit-learn, LangChain
- **Data**: pandas, numpy

### Frontend
- **Framework**: React
- **UI**: Material-UI
- **State**: React Context/Hooks
- **Charts**: Recharts/Chart.js

### AI
- **Face Recognition**: InceptionResnetV1
- **Embeddings**: 512D vectors
- **Storage**: pgvector

---

## 📦 Supported Locations

Occupancy tracking and prediction for:

| Location | Capacity | Location | Capacity |
|----------|----------|----------|----------|
| Library | 2150 | Cafeteria | 1360 |
| Auditorium | 1360 | Hostel | 5000 |
| Gym | 1012 | Faculty Office | 650 |
| Seminar Room | 1800 | Main Building | 30 |
| LAB_101 | 40 | LAB_102 | 15 |
| LAB_305 | 30 | LAB_A1 | 20 |
| LAB_A2 | 12 | LAB | 30 |
| WORKSHOP | 20 | Admin Lobby | 710 |

---

## 🧪 Testing

### Test Occupancy Prediction
```bash
curl -X POST "http://localhost:8000/api/forecast/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"location_id": "Library", "future_time": "2024-10-25T14:30:00Z"}'
```

### Test Alert System
```bash
curl "http://localhost:8000/api/alerts/" \
  -H "Authorization: Bearer <token>"
```

### Test Face Search
```bash
curl -X POST "http://localhost:8000/api/search/face/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"embedding": [0.123, -0.456, ...]}'  # 512 floats
```

---

## 📚 Documentation

For detailed setup, API documentation, and configuration:

- **Frontend**: `/Frontend/README.md`
- **Backend**: `/Backend/README.md`
- **AI Module**: `/AI/README.md`

---

## 🎓 Use Cases

### Campus Security
- Real-time monitoring of all entities
- Instant alerts for unusual activity
- Predictive threat detection

### Space Management
- Optimize room allocations
- Forecast peak usage times
- Improve resource utilization

### Student Services
- Track attendance patterns
- Identify students needing support
- Analyze facility usage

### Emergency Response
- Quick entity location tracking
- Missing person detection
- Evacuation planning

---

## 🔒 Security Features

- JWT authentication with token refresh and blacklist
- Role-based access control (student, faculty, staff)
- Secure face embedding storage
- Encrypted database connections
- API rate limiting

---

## 🚧 Future Enhancements

- [ ] Real-time occupancy streaming via WebSockets
- [ ] Anomaly detection for unusual patterns
- [ ] Multi-location route optimization
- [ ] Predictive maintenance alerts
- [ ] Mobile app integration
- [ ] Integration with building management systems

---



## 👥 Contributors

**ChaosCoded**

---

### Start from the Backend, connect the AI, and visualize it all through the Frontend.
#### The **CampusSentinel** ecosystem awaits. 🚀
