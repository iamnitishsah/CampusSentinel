import pandas as pd
from .summarizer import model as gemini_model

def get_prediction_explanation(entity_data: pd.DataFrame, predicted_location: str, future_time) -> str:
    recent_activity = entity_data.tail(5)
    activity_summary = "\n".join(
        [f"- At {row['timestamp'].strftime('%I:%M %p')}, they were at {row['location']}." for index, row in recent_activity.iterrows()]
    )

    prompt = f"""
    Purpose:
    Summarize, in plain non-technical language, why a temporal-features Random Forest model predicted the entity's next location.

    Data & Workflow (short bullet points):
    - Dataset contains timestamps and known locations (location_encoded).
    - Removed rows with missing locations.
    - Extracted features: hour, day_of_week (0=Mon..6=Sun), is_weekend (0/1).
    - Trained a RandomForestClassifier on an 80/20 train/test split.
    - Used the trained model to predict a new timestamp and decoded the label to the original location name.

    Recent activity (context):
    {activity_summary}

    Prediction details:
    Timestamp: {future_time}
    Predicted Location: {predicted_location}

    Output instructions:
    Write a single short paragraph (2-4 sentences), non-technical and logical, explaining in simple terms why the model likely chose this predicted location given the recent activity and the temporal features. Keep it clear and concise.
    """

    try:
        response = gemini_model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API error: {e}")
        return f"Based on historical data patterns, the entity's next likely location is {predicted_location}."