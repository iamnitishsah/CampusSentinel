import os
import pandas as pd
import google.generativeai as genai
from datetime import datetime, time
from asgiref.sync import sync_to_async
from .models import Event
import asyncio

# --- Gemini Client Initialization ---
# It's better to get the API key from environment variables for security
# The model will be initialized once when the Django app starts (see apps.py)
try:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-pro")
    print("Gemini client initialized successfully.")
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    model = None


# --- Helper Functions ---

def timeline_to_human_text(timeline_df):
    """
    Converts a DataFrame of timeline events into a human-readable text string,
    grouping consecutive events at the same location.
    """
    if timeline_df.empty:
        return ""

    lines = []
    # Ensure timestamp is a datetime object and sort
    timeline_df['timestamp'] = pd.to_datetime(timeline_df['timestamp'])
    timeline_df = timeline_df.sort_values('timestamp').reset_index(drop=True)

    # Forward-fill missing locations to group time blocks more effectively
    timeline_df['location'] = timeline_df['location'].ffill()
    timeline_df.dropna(subset=['location'], inplace=True)

    if timeline_df.empty:
        return ""

    start_time = timeline_df.iloc[0]['timestamp']
    current_location = timeline_df.iloc[0]['location']

    for i in range(1, len(timeline_df)):
        entry = timeline_df.iloc[i]
        # If location changes, finalize the previous block
        if entry['location'] != current_location:
            end_time = entry['timestamp']
            duration_minutes = round((end_time - start_time).total_seconds() / 60)

            if duration_minutes > 1:  # Only report significant stays
                lines.append(
                    f"From {start_time.strftime('%H:%M')} to {end_time.strftime('%H:%M')} ({duration_minutes} minutes), the person was at {current_location}."
                )

            # Start a new block
            start_time = entry['timestamp']
            current_location = entry['location']

    # Add the final block of time
    end_time = timeline_df.iloc[-1]['timestamp']
    duration_minutes = round((end_time - start_time).total_seconds() / 60)
    if duration_minutes > 1:
        lines.append(
            f"From {start_time.strftime('%H:%M')} to {end_time.strftime('%H:%M')} ({duration_minutes} minutes), the person was at {current_location}."
        )

    return " ".join(lines)


# --- Main Asynchronous Summarization Function ---

async def get_summary_for_entity(entity_id: str, start_time: datetime, end_time: datetime) -> str:
    """
    Asynchronously fetches timeline data and generates a summary using the Gemini model.
    """
    if not model:
        return "Error: Summarization model is not available."

    # 1. Fetch data from the database asynchronously
    events_qs = Event.objects.filter(
        entity__entity_id=entity_id,
        timestamp__gte=start_time,
        timestamp__lte=end_time,
        location__isnull=False
    ).order_by('timestamp')

    # Use sync_to_async to run the synchronous ORM query in an async-safe way
    events_data = await sync_to_async(list)(events_qs.values('timestamp', 'location', 'event_type'))

    if not events_data:
        return "No activity with location data found for this person in the selected time range."

    # 2. Convert to DataFrame and generate human-readable text
    timeline_df = pd.DataFrame(events_data)
    human_readable_text = timeline_to_human_text(timeline_df)

    if not human_readable_text:
        return "Not enough data to generate a meaningful summary."

    # 3. Generate summary using Gemini API
    prompt = (
        "Summarize the person's activities based on the following timeline. "
        "Create a concise, professional-sounding paragraph that flows naturally. "
        "Focus on where they spent significant amounts of time.\n\n"
        "Mention the time when and where they were."
        f"Timeline:\n{human_readable_text}"
    )

    # prompt = ("summerise the whole day of this specific person on the basis of timeline and tell where he spent his time and how much. it should be easy and professional language. this is the activity timeline of the person:\n" f"{human_readable_text}")

    try:
        # Run the blocking I/O call in a separate thread
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return "An error occurred while generating the summary."
