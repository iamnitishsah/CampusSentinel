import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime
import pytz


class OccupancyPredictor:


    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        self.feature_cols = []

    def _prepare_features(self, df):
        df['start_time'] = pd.to_datetime(df['start_time'])

        if df['start_time'].dt.tz is not None:
            df['start_time'] = df['start_time'].dt.tz_convert('Asia/Kolkata').dt.tz_localize(None)
        df['year'] = df['start_time'].dt.year
        df['month'] = df['start_time'].dt.month
        df['day'] = df['start_time'].dt.day
        df['hour'] = df['start_time'].dt.hour
        df['minute'] = df['start_time'].dt.minute
        df['day_of_week'] = df['start_time'].dt.dayofweek
        df['day_of_month'] = df['start_time'].dt.day
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['week_of_year'] = df['start_time'].dt.isocalendar().week
        df['time_in_minutes'] = df['hour'] * 60 + df['minute']
        df['time_period'] = pd.cut(df['hour'],
                                   bins=[0, 6, 12, 18, 24],
                                   labels=['Night', 'Morning', 'Afternoon', 'Evening'],
                                   include_lowest=True)

        time_period_dummies = pd.get_dummies(df['time_period'], prefix='period')
        df = pd.concat([df, time_period_dummies], axis=1)

        feature_cols = ['year', 'month', 'day', 'hour', 'minute', 'day_of_week',
                        'day_of_month', 'is_weekend', 'week_of_year', 'time_in_minutes']
        period_cols = [col for col in df.columns if col.startswith('period_')]
        feature_cols.extend(period_cols)

        return df, feature_cols

    def _create_prediction_features(self, future_time, feature_cols):
        dt = pd.to_datetime(future_time)

        if dt.tzinfo is not None:
            ist = pytz.timezone('Asia/Kolkata')
            dt = dt.astimezone(ist).replace(tzinfo=None)

        features = {
            'year': dt.year,
            'month': dt.month,
            'day': dt.day,
            'hour': dt.hour,
            'minute': dt.minute,
            'day_of_week': dt.dayofweek,
            'day_of_month': dt.day,
            'is_weekend': 1 if dt.dayofweek >= 5 else 0,
            'week_of_year': dt.isocalendar().week,
            'time_in_minutes': dt.hour * 60 + dt.minute
        }

        hour = dt.hour
        if hour < 6:
            period = 'Night'
        elif hour < 12:
            period = 'Morning'
        elif hour < 18:
            period = 'Afternoon'
        else:
            period = 'Evening'

        for p in ['Night', 'Morning', 'Afternoon', 'Evening']:
            features[f'period_{p}'] = 1 if p == period else 0

        X_pred = pd.DataFrame([features])

        X_pred = X_pred.reindex(columns=feature_cols, fill_value=0)

        return X_pred

    def train_and_predict(self, historical_data_qs, future_time: datetime) -> int:
        """
        Trains the model on historical data (for one location)
        and predicts for a future time.

        Args:
            historical_data_qs: A pre-filtered QuerySet for ONE location.
            future_time: A datetime object (aware or naive) for prediction.

        Returns:
            int: Predicted occupancy count
        """
        if not historical_data_qs.exists():
            return 0

        df = pd.DataFrame(list(historical_data_qs.values('start_time', 'count')))

        df_prepared, self.feature_cols = self._prepare_features(df)

        X_train = df_prepared[self.feature_cols]
        y_train = df_prepared['count']

        self.model.fit(X_train, y_train)

        X_new = self._create_prediction_features(future_time, self.feature_cols)

        predicted_count = self.model.predict(X_new)[0]

        return max(0, int(round(predicted_count)))