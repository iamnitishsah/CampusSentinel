import os
import requests
from langchain_core.tools import tool
from datetime import datetime

API_BASE_URL = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000")

AUTH_TOKEN = None


def login(email: str, password: str) -> dict:
    """Authenticates the agent with the backend API."""
    global AUTH_TOKEN
    try:
        payload = {"email": email, "password": password}
        response = requests.post(f"{API_BASE_URL}/users/login/", json=payload)
        response.raise_for_status()
        tokens = response.json().get("tokens", {})
        AUTH_TOKEN = tokens.get("access")
        if AUTH_TOKEN:
            return {"status": "Login successful. Agent is online."}
        else:
            return {"error": "Login failed, could not retrieve access token."}
    except requests.exceptions.RequestException as e:
        return {"error": f"Login failed: {str(e)}"}


def _get_auth_headers() -> dict:
    """Returns authorization headers for API requests."""
    if not AUTH_TOKEN:
        raise Exception("Authentication token is missing. The agent is offline.")
    return {"Authorization": f"Bearer {AUTH_TOKEN}"}


@tool
def search_entity(query: str) -> dict:
    """
    Searches for an entity (student, staff, etc.) by their name, email, or any known ID.
    Returns the profile information of the matched entity including their entity_id.

    Args:
        query: Name, email, or ID of the person to search for

    Returns:
        Dictionary with entity information including entity_id, name, role, etc.
    """
    try:
        headers = _get_auth_headers()
        response = requests.get(
            f"{API_BASE_URL}/api/entities/",
            params={"q": query},
            headers=headers
        )
        response.raise_for_status()
        results = response.json()

        if not results:
            return {"error": "No entity found matching that query."}

        return results[0]
    except requests.exceptions.RequestException as e:
        error_detail = e.response.json().get('detail', str(e)) if e.response else str(e)
        return {"error": f"API request failed: {error_detail}"}


@tool
def get_timeline(entity_id: str, date: str) -> dict:
    """
    Retrieves the complete activity timeline for a specific entity on a given date.
    Shows all locations visited and times.

    Args:
        entity_id: The unique ID of the entity (from search_entity)
        date: Date in 'YYYY-MM-DD' format (e.g., '2025-10-23')

    Returns:
        Dictionary with timeline data showing movements and locations
    """
    try:
        headers = _get_auth_headers()
        datetime.strptime(date, "%Y-%m-%d")

        response = requests.get(
            f"{API_BASE_URL}/api/entities/{entity_id}/timeline/",
            params={"date": date},
            headers=headers
        )
        response.raise_for_status()
        return response.json()
    except ValueError:
        return {"error": "Invalid date format. Please use YYYY-MM-DD."}
    except requests.exceptions.RequestException as e:
        error_detail = e.response.json().get('detail', str(e)) if e.response else str(e)
        return {"error": f"API request failed: {error_detail}"}


@tool
def predict_location(entity_id: str) -> dict:
    """
    Predicts an entity's most likely location in the next hour based on their patterns.

    Args:
        entity_id: The unique ID of the entity (from search_entity)

    Returns:
        Dictionary with predicted location and confidence level
    """
    try:
        headers = _get_auth_headers()
        response = requests.post(
            f"{API_BASE_URL}/api/predict/",
            json={"entity_id": entity_id},
            headers=headers
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        error_detail = e.response.json().get('detail', str(e)) if e.response else str(e)
        return {"error": f"API request failed: {error_detail}"}


@tool
def get_alerts(hours: int = 12) -> dict:
    """
    Retrieves security alerts for entities not observed in the campus in the last N hours.
    Useful for finding missing persons or unusual absences.

    Args:
        hours: Number of hours to look back (default: 12)

    Returns:
        Dictionary with list of entities and their last seen information
    """
    try:
        headers = _get_auth_headers()
        response = requests.get(
            f"{API_BASE_URL}/api/alerts/",
            params={"hours": hours},
            headers=headers
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        error_detail = e.response.json().get('detail', str(e)) if e.response else str(e)
        return {"error": f"API request failed: {error_detail}"}
