import pandas as pd
from django.utils import timezone
from datetime import timedelta
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

class LocationPredictor:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self.label_encoder = LabelEncoder()

    def train_and_predict(self, events_qs):
        if not events_qs.exists():
            return None, None, None

        entity_df = pd.DataFrame(list(events_qs))

        entity_df['timestamp'] = pd.to_datetime(entity_df['timestamp'])
        entity_df['hour'] = entity_df['timestamp'].dt.hour
        entity_df['day_of_week'] = entity_df['timestamp'].dt.dayofweek
        entity_df['is_weekend'] = entity_df['day_of_week'].isin([5, 6]).astype(int)

        entity_df['location_encoded'] = self.label_encoder.fit_transform(entity_df['location'])

        if len(entity_df['location_encoded'].unique()) < 2:
            last_location = entity_df['location'].iloc[-1]
            return last_location, timezone.now(), entity_df

        X = entity_df[['hour', 'day_of_week', 'is_weekend']]
        y = entity_df['location_encoded']

        self.model.fit(X, y)

        future_time = timezone.now() + timedelta(hours=1)
        X_new = pd.DataFrame({
            'hour': [future_time.hour],
            'day_of_week': [future_time.weekday()],
            'is_weekend': [int(future_time.weekday() in [5, 6])]
        })

        prediction_encoded = self.model.predict(X_new)
        predicted_location = self.label_encoder.inverse_transform(prediction_encoded)[0]

        return predicted_location, future_time, entity_df