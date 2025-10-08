import os
import pandas as pd
import google.generativeai as genai
from datetime import datetime, time
from asgiref.sync import sync_to_async
from .models import Event
import asyncio


try:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    print("Gemini initialized.")
except Exception as e:
    print(f"Error initializing Gemini: {e}")
    model = None



def timeline_to_human_text(timeline_df):
    if timeline_df.empty:
        return ""

    lines = []
    timeline_df['timestamp'] = pd.to_datetime(timeline_df['timestamp'])
    timeline_df = timeline_df.sort_values('timestamp').reset_index(drop=True)

    timeline_df['location'] = timeline_df['location'].ffill()
    timeline_df.dropna(subset=['location'], inplace=True)

    if timeline_df.empty:
        return ""

    start_time = timeline_df.iloc[0]['timestamp']
    current_location = timeline_df.iloc[0]['location']

    for i in range(1, len(timeline_df)):
        entry = timeline_df.iloc[i]
        if entry['location'] != current_location:
            end_time = entry['timestamp']
            duration_minutes = round((end_time - start_time).total_seconds() / 60)

            if duration_minutes > 1:
                lines.append(
                    f"From {start_time.strftime('%H:%M')} to {end_time.strftime('%H:%M')} ({duration_minutes} minutes), the person was at {current_location}."
                )

            start_time = entry['timestamp']
            current_location = entry['location']

    end_time = timeline_df.iloc[-1]['timestamp']
    duration_minutes = round((end_time - start_time).total_seconds() / 60)
    if duration_minutes > 1:
        lines.append(
            f"From {start_time.strftime('%H:%M')} to {end_time.strftime('%H:%M')} ({duration_minutes} minutes), the person was at {current_location}."
        )

    return " ".join(lines)



async def get_summary_for_entity(entity_id: str, start_time: datetime, end_time: datetime) -> str:
    if not model:
        return "Error: Summarization model is not available."

    events_qs = Event.objects.filter(
        entity__entity_id=entity_id,
        timestamp__gte=start_time,
        timestamp__lte=end_time,
        location__isnull=False
    ).order_by('timestamp')

    events_data = await sync_to_async(list)(events_qs.values('timestamp', 'location', 'event_type'))

    if not events_data:
        return "No activity with location data found for this person in the selected time range."

    timeline_df = pd.DataFrame(events_data)
    human_readable_text = timeline_to_human_text(timeline_df)

    if not human_readable_text:
        return "Not enough data to generate a meaningful summary."

    prompt = (
        "You are an assistant that summarizes a person's daily activity timeline. "
        "Write a short, easy-to-understand summary that sounds like someone naturally describing the day. "
        "The output should start directly with the description — do NOT include any greetings, titles, or headers "
        "Use a friendly but professional tone — clear, factual, and flowing like a human explanation.\n\n"
        "Guidelines:\n"
        "- Mention key time points (start and end times) for each major activity.\n"
        "- Clearly describe what the person was doing and where.\n"
        "- Include approximate duration (in hours and minutes) naturally within the sentences.\n"
        "- Use bullet points for better human-readable summarization.\n"
        "- Make it sound like a smooth narrative.\n"
        "- Keep the language neutral, factual, and readable for frontend display.\n\n"
        f"Here is the activity timeline data:\n{human_readable_text}"
    )

    # prompt = ("summerize the whole day of this specific person on the basis of timeline and tell where he spent his time and how much. it should be easy and professional language. this is the activity timeline of the person:\n" f"{human_readable_text}")

    try:
        response = await asyncio.to_thread(model.generate_content, prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return "An error occurred while generating the summary."
