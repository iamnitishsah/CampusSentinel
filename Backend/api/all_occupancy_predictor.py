import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime


class AllLocationsOccupancyPredictor:
    """
    A predictor designed to be initialized with a complete DataFrame of
    all historical data for all locations. It can then efficiently
    train and predict for any given location from this internal DataFrame.
    """

    def __init__(self, all_data_df: pd.DataFrame):
        """
        Initializes the predictor with all historical data.

        Args:
            all_data_df: A DataFrame containing at least
                         ['start_time', 'location_id', 'count']
                         for ALL locations.
        """
        self.all_data_df = all_data_df
        if 'start_time' not in self.all_data_df.columns or not pd.api.types.is_datetime64_any_dtype(
                self.all_data_df['start_time']):
            self.all_data_df['start_time'] = pd.to_datetime(self.all_data_df['start_time'])

    def _prepare_features(self, df):
        """Prepares time-based features for a given DataFrame."""
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

        return df, sorted(list(set(feature_cols)))

    def _create_prediction_features(self, future_time, feature_cols):
        """Creates a single-row DataFrame for prediction."""
        dt = pd.to_datetime(future_time)
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

    def predict_for_location(self, location_id: str, future_time: datetime) -> int:
        """
        Trains a model for a specific location (using the internal DataFrame)
        and returns a single prediction.
        """
        location_df = self.all_data_df[
            self.all_data_df['location_id'] == location_id
            ][['start_time', 'count']].copy()

        if location_df.empty:
            return 0

        # 1. Prepare features for this location's data
        df_prepared, feature_cols = self._prepare_features(location_df)

        X_train = df_prepared[feature_cols]
        y_train = df_prepared['count']

        # 2. Initialize and train a fresh model
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_train, y_train)

        # 3. Create prediction features based on this model's columns
        X_new = self._create_prediction_features(future_time, feature_cols)

        # 4. Predict
        predicted_count = model.predict(X_new)[0]
        return max(0, int(round(predicted_count)))
