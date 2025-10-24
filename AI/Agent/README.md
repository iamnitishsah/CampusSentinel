
# CampuSentinal — AI Campus Security Assistant

**CampuSentinal** is an AI-powered chat agent built to interface with a campus security backend API. It exposes a conversational HTTP API (FastAPI) and uses a LangGraph-driven agent with an LLM (e.g., Google Gemini or OpenAI GPT) plus a set of backend tools to answer operator queries such as searching for people, getting activity timelines, predicting locations, and raising alerts.

---

## Table of Contents

1. [Overview](#overview)  
2. [Features](#features)  
3. [Architecture](#architecture)  
4. [Quickstart](#quickstart)  
   - [Prerequisites](#prerequisites)  
   - [Install](#install)  
   - [Environment variables (.env)](#environment-variables-env)  
   - [Run](#run)  
5. [API Reference](#api-reference)  
   - `GET /` — Status  
   - `POST /chat` — Conversational endpoint  
6. [Agent Tools (what the AI can call)](#agent-tools-what-the-ai-can-call)  
   - `search_entity(query: str)`  
   - `get_timeline(entity_id: str, date: str)`  
   - `predict_location(entity_id: str)`  
   - `get_alerts(hours: int = 12)`  
7. [Session & Conversation Management](#session--conversation-management)  
8. [Example Requests & Responses](#example-requests--responses)  
9. [Error Handling & Logging](#error-handling--logging)  
10. [Testing](#testing)  
11. [Deployment & Production Notes](#deployment--production-notes)  
12. [Security Considerations](#security-considerations)  
13. [Customizing the Agent](#customizing-the-agent)  
14. [Contributing](#contributing)  
15. [License](#license)

---
# Overview

CampuSentinal is a server + agent that enables campus security operators to ask natural language questions and receive structured, tool-backed answers. The agent decides whether to call one of several backend tools (search, timeline, alerts, prediction) and returns human-readable replies plus the session ID for stateful conversations.

> Recommendation: update `system_prompt` in `agent.py` from "Saptang Campus Security system" to "CampuSentinal" so responses and internal role references match the project name.

---
# Features

- Natural-language conversational interface for security staff  
- Entity lookup (student, staff, visitor) by name / email / ID  
- Detailed per-entity activity timeline retrieval by date  
- Simple short-term location predictions (next hour)  
- Alert queries for missing / unseen entities in a configurable window  
- Session-based conversational memory (session_id to continue threads)  

---
# Architecture

- `server.py` — FastAPI server exposing `/` and `/chat`. Handles startup, environment, login to the backend API, and forwarding messages to the agent.  
- `agent.py` — Agent logic (LangGraph-like graph) which instructs the LLM and binds tools. Handles conversation state and tool orchestration.  
- `tools.py` — Implementations of backend API calls (login + tool functions like `search_entity`, `get_timeline`, `predict_location`, `get_alerts`) decorated as tools the agent can use.  

The agent uses credentials to authenticate with the campus backend on server startup and then processes incoming messages by deciding whether and which tool(s) to call, assembling a final response to return via `/chat`.

---
# Quickstart

## Prerequisites

- Python 3.9+  
- Access to your campus backend API (endpoints used in `tools.py`)  
- LLM API key (Google Gemini key or OpenAI key)  
- `uvicorn` for running FastAPI

## Install

Create a virtual environment and install required dependencies. If you have `requirements.txt`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If you don't have a `requirements.txt`, typical libraries used in this project:

```
fastapi
uvicorn
python-dotenv
requests
langgraph   # or the actual LLM orchestration package used
openai      # if using OpenAI
# plus any library required for Gemini (if applicable)
```

## Environment variables (.env)

Create a `.env` file in the project root. Example:

```env
# .env

# --- Agent backend login (used by tools.py) ---
AGENT_EMAIL="agent@example.com"
AGENT_PASSWORD="supersecretpassword"

# --- LLM API Keys (use whichever provider you prefer) ---
GEMINI_API_KEY="your-google-gemini-api-key"
# OPENAI_API_KEY="your-openai-api-key"  # optional, uncomment if using OpenAI

# --- Backend API ---
API_BASE_URL="http://127.0.0.1:8000"  # or your campus backend URL

# Optional: logging or debugging flag
LOG_LEVEL=INFO
```

**Important:** Keep `.env` out of version control. Add `.env` to `.gitignore`.

## Run

Start the server:

```bash
python server.py
```

Expected startup sequence (examples):

```
INFO:     Uvicorn running on http://0.0.0.0:8080
Loading environment variables...
Attempting agent login...
Login successful: <login response>
INFO:     Application startup complete.
```

---
# API Reference

All API calls use JSON for requests and responses and `Content-Type: application/json`.

## `GET /`

Return server status.

**Request**

```bash
curl -X GET "http://127.0.0.1:8080/"
```

**Response (200 OK)**

```json
{
  "status": "Agent server is running. POST to /chat to interact."
}
```

## `POST /chat`

Main entrypoint for operator messages. This is stateful: include `session_id` from previous responses to continue a conversation.

**Request Body (application/json)**

```json
{
  "message": "string",       // required
  "session_id": "string"     // optional: pass to continue same conversation
}
```

**Behavior**

- If `session_id` is omitted, server creates a new conversation thread and returns a `session_id`.
- Agent will decide whether to call tools in `tools.py` to fetch data.
- The response contains a human-friendly text reply plus the `session_id`.

**Example: Start New Conversation**

```bash
curl -X POST "http://127.0.0.1:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{
        "message": "Hi, find a student named John Doe"
      }'
```

**Example Response (200 OK)**

```json
{
  "response": "I found a matching profile: John Doe, Student, Student ID: 100234, entity_id: 'ent_johndoe_123'. What would you like to do next?",
  "session_id": "session_20251024_120130_123456"
}
```

**Continue Conversation**

```bash
curl -X POST "http://127.0.0.1:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{
        "message": "Get his timeline for today",
        "session_id": "session_20251024_120130_123456"
      }'
```

**Error Response Example**

```json
{
  "error": "API request failed: {'detail': 'Entity not found'}",
  "session_id": "session_20251024_120130_123456"
}
```

---
# Agent Tools (what the AI can call)

The agent has a set of tool functions implemented in `tools.py`. The agent chooses when to call them. Below are argument shapes and example usage. The agent handles mapping of natural language requests to these tool calls; you do not need to call these tools directly unless you are testing.

### `search_entity(query: str) -> dict`

Search for a person or entity by name, email, or ID.

- **Args**
  - `query` — search string (name, email, or ID)
- **Returns**
  - list/dict of matching profiles with fields like `{name, role, student_id, entity_id, last_seen, last_known_location}`
- **Example**
  - Input: `"John Doe"`
  - Output (example): `[{ "name": "John Doe", "role": "Student", "student_id": "100234", "entity_id": "ent_johndoe_123" }]`

### `get_timeline(entity_id: str, date: str) -> dict`

Retrieve activity timeline for `entity_id` on `date` (YYYY-MM-DD).

- **Args**
  - `entity_id` — unique id returned by `search_entity`
  - `date` — `YYYY-MM-DD`. If omitted, agent may default to today's date.
- **Returns**
  - Ordered list of events: `[{"timestamp": "...", "location": "...", "sensor": "...", "meta": {...}}, ...]`

### `predict_location(entity_id: str) -> dict`

Short-term location prediction for the next hour (statistical heuristics or ML-based).

- **Args**
  - `entity_id`
- **Returns**
  - `{ "predicted_location": "...", "confidence": 0.72, "reason": "based on last 10 days' patterns" }`

### `get_alerts(hours: int = 12) -> dict`

Return entities not seen in the last `hours`.

- **Args**
  - `hours` — integer, default 12
- **Returns**
  - List of alerts: `[{"entity_id":"...", "name":"...", "last_seen":"...", "hours_missing": 18}, ...]`

---
# Session & Conversation Management

- Each successful `POST /chat` returns a `session_id` when a new session is started.
- Client should persist and reuse `session_id` to maintain conversational context.
- Server stores conversation state and uses it when responding (e.g., resolving pronouns like "him" or "her" to a previously referenced entity).
- Session IDs are opaque strings (e.g., `session_YYYYMMDD_HHMMSS_<random>`).

---
# Example Requests & Responses

### Python (requests)

```python
import requests

BASE = "http://127.0.0.1:8080"

# Start a new conversation
r = requests.post(f"{BASE}/chat", json={"message": "Find student Jane Smith"})
print(r.json())
# -> {"response": "Found ...", "session_id": "session_..."}

# Continue the conversation
session_id = r.json()["session_id"]
r2 = requests.post(f"{BASE}/chat", json={
    "message": "Get her timeline for 2025-10-24",
    "session_id": session_id
})
print(r2.json())
```

### cURL

Start conversation:
```bash
curl -X POST "http://127.0.0.1:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me alerts for the last 24 hours"}'
```

Continue conversation:
```bash
curl -X POST "http://127.0.0.1:8080/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me the timeline", "session_id":"session_..."}'
```

---
# Error Handling & Logging

The server returns `200 OK` for successful operations and `200` with an `"error"` field when the internal agent or tools raise an exception. Typical error shapes:

```json
{
  "error": "Human-friendly error message or backend API error",
  "session_id": "session_..."
}
```

Log output (server) includes:
- Env loading
- Agent login attempts and result
- Tool invocation traces (if enabled)
- Agent-to-LLM prompt/response lifecycle (obfuscate secrets if you log)

**Recommendation:** Do not log sensitive data such as full API tokens, passwords, or PII in public logs.

---

# License

This project has no license file in the template. Add one according to your organization’s policy. Example: MIT License.

---