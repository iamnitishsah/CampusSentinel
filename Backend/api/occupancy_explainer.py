import os
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv
from datetime import datetime
import pytz

try:
    load_dotenv()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
    print("Occupancy Explainer: Gemini initialized.")
except Exception as e:
    print(f"Error initializing Gemini for Explainer: {e}")
    gemini_model = None


def analyze_historical_data(df, location, target_time):
    dt = pd.to_datetime(target_time)

    if dt.tzinfo is not None:
        ist = pytz.timezone('Asia/Kolkata')
        dt = dt.astimezone(ist).replace(tzinfo=None)

    location_data = df[df['location_id'] == location].copy()

    if len(location_data) == 0:
        return None

    location_data['start_time'] = pd.to_datetime(location_data['start_time'])

    if location_data['start_time'].dt.tz is not None:
        location_data['start_time'] = location_data['start_time'].dt.tz_convert('Asia/Kolkata').dt.tz_localize(None)

    location_data['hour'] = location_data['start_time'].dt.hour
    location_data['day_of_week'] = location_data['start_time'].dt.dayofweek
    location_data['is_weekend'] = (location_data['day_of_week'] >= 5).astype(int)

    target_hour = dt.hour
    target_dow = dt.dayofweek
    target_is_weekend = 1 if target_dow >= 5 else 0

    same_hour = location_data[location_data['hour'] == target_hour]

    same_dow = location_data[location_data['day_of_week'] == target_dow]

    analysis = {
        'location': location,
        'target_time': target_time,
        'target_hour': target_hour,
        'target_dow': target_dow,
        'is_weekend': target_is_weekend,
        'avg_count_location': location_data['count'].mean(),
        'same_hour_avg': same_hour['count'].mean() if len(same_hour) > 0 else 0,
        'same_dow_avg': same_dow['count'].mean() if len(same_dow) > 0 else 0,
    }
    return analysis


def generate_summary_with_gemini(prediction, analysis, period):

    if not gemini_model:
        return "Explanation service is unavailable."

    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    if prediction > analysis['avg_count_location']:
        crowd_level = "bustling with activity"
    else:
        crowd_level = "relatively quiet"

    prompt = f"""
You are a data analyst explaining crowd patterns in a professional yet engaging storytelling manner.

PREDICTION DETAILS:
- Location: {analysis['location']}
- Day: {day_names[analysis['target_dow']]} ({'Weekend' if analysis['is_weekend'] else 'Weekday'})
- Time: {analysis['target_hour']}:00 ({period})
- Expected Count: {prediction} people

HISTORICAL PATTERNS OBSERVED:
- This location typically has around {analysis['avg_count_location']:.0f} people.
- At {analysis['target_hour']}:00, we usually observe approximately {analysis['same_hour_avg']:.0f} people.
- On {day_names[analysis['target_dow']]}s, the pattern shows around {analysis['same_dow_avg']:.0f} people.

TASK: Write a 4-5 sentence narrative explanation in a formal yet storytelling style. 

IMPORTANT GUIDELINES:
1. Start with: "From previous data, I see that {analysis['location']} is {crowd_level} during this time..." 
2. DO NOT compare with averages or use phrases like "compared to" or "higher/lower than average".
3. Instead, describe the PATTERN: "generally sees fewer people", "tends to attract more visitors".
4. Tell a story about the time pattern: Why does this time of day/week have this pattern?
5. Focus on the TIME and DAY patterns, not numerical comparisons.
6. MUST include the predicted value naturally in the explanation: "The predicted value is {prediction} people because..." 
7. End with an insight about what makes this time period unique.
"""

    try:
        response = gemini_model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Explainer Error: {e}")
        return "An error occurred while generating the explanation."


def get_occupancy_explanation(prediction: int, df_full: pd.DataFrame, location_id: str, future_time: datetime) -> str:
    """
    Main function to get the Gemini-powered explanation.

    Args:
        prediction: Predicted occupancy count
        df_full: Full DataFrame with all occupancy data
        location_id: Location ID for prediction
        future_time: Future datetime for prediction

    Returns:
        str: Explanation text
    """
    analysis = analyze_historical_data(df_full, location_id, future_time)
    if analysis is None:
        return "Not enough historical data for an explanation."

    dt = pd.to_datetime(future_time)
    if dt.tzinfo is not None:
        ist = pytz.timezone('Asia/Kolkata')
        dt = dt.astimezone(ist).replace(tzinfo=None)

    hour = dt.hour
    if hour < 6:
        period = 'Night'
    elif hour < 12:
        period = 'Morning'
    elif hour < 18:
        period = 'Afternoon'
    else:
        period = 'Evening'

    explanation = generate_summary_with_gemini(
        prediction, analysis, period
    )

    return explanation