import time
import asyncio
import pandas as pd
import os
from datetime import time as time_module
from rest_framework import generics, status, viewsets
from django.db.models import Q, Max, F, Window, OuterRef, Subquery
from asgiref.sync import async_to_sync, sync_to_async
from . import serializers
from pgvector.django import CosineDistance
from .summarizer import get_summary_for_entity
from .prediction import LocationPredictor
from .explanation import get_prediction_explanation
from django.utils import timezone
from datetime import timedelta, datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from . import models
from .occupancy_predictor import OccupancyPredictor  # Original for single view
from .all_occupancy_predictor import AllLocationsOccupancyPredictor  # New for bulk view
from .occupancy_explainer import get_occupancy_explanation
from .ActionRecommendation import GeminiAlertRecommender

SIMULATION_NOW = timezone.make_aware(datetime(2025, 9, 25, 23, 59, 59))

LOCATION_MAX_CAPACITY = {
    'Admin Lobby': 710,
    'Auditorium': 1360,
    'Hostel': 5000,
    'LAB_102': 15,
    'LAB': 30,
    'Library': 2150,
    'Seminar Room': 1800,
    'WORKSHOP': 20,
    'LAB_305': 30,
    'Gym': 1012,
    'LAB_101': 40,
    'Cafeteria': 1360,
    'LAB_A2': 12,
    'LAB_A1': 20,
    'Main Building': 30,
    'Faculty Office': 650
}

ACCESS_RULES = {
    'Faculty Office': ['faculty', 'staff'],
    'LAB_305': ['faculty', 'student'],
    'Hostel': ['student'],
    'Admin Lobby': ['faculty', 'staff'],
    'Main Building': ['faculty', 'staff'],
    'Library': ['faculty', 'staff', 'student']
}


def get_occupancy_status(location_name, predicted_count):
    max_capacity = LOCATION_MAX_CAPACITY.get(location_name)
    if not max_capacity:
        return "Normal"
    ratio = predicted_count / max_capacity
    if ratio > 0.9:
        return "Overcrowded"
    elif ratio < 0.3:
        return "Underused"
    else:
        return "Normal"


class ProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = models.Profile.objects.order_by('entity_id')[:100]
    serializer_class = serializers.ProfileSerializer
    lookup_field = 'entity_id'


class EntitySearchAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = serializers.ProfileSerializer

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        if not q: return models.Profile.objects.none()
        return models.Profile.objects.filter(
            Q(name__icontains=q) | Q(email__icontains=q) | Q(card_id__icontains=q) |
            Q(device_hash__icontains=q) | Q(face_id__icontains=q) | Q(entity_id__icontains=q) |
            Q(student_id__icontains=q) | Q(staff_id__icontains=q)
        ).order_by("name")[:50]


class ProfileDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = serializers.ProfileSerializer
    lookup_field = "entity_id"
    queryset = models.Profile.objects.all()

    def retrieve(self, request, *args, **kwargs):
        inst = self.get_object()
        data = self.get_serializer(inst).data
        last_seen = models.Event.objects.filter(entity=inst).aggregate(last_seen=Max("timestamp"))["last_seen"]
        data["last_seen"] = last_seen
        return Response(data)


class AlertsListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        all_alerts = []
        hours_param = 10

        gap_threshold = timedelta(hours=hours_param)
        recent_window_start = SIMULATION_NOW - timedelta(days=4)
        events = models.Event.objects.filter(
            entity__isnull=False,
            timestamp__lte=SIMULATION_NOW,
            timestamp__gte=recent_window_start
        ).select_related('entity').order_by('entity_id', 'timestamp').values(
            'entity_id', 'entity__name', 'entity__email', 'timestamp'
        )

        entity_events = {}
        for event in events:
            entity_id = event['entity_id']
            if entity_id not in entity_events:
                entity_events[entity_id] = {
                    'name': event['entity__name'],
                    'email': event['entity__email'],
                    'timestamps': []
                }
            entity_events[entity_id]['timestamps'].append(event['timestamp'])

        # Missing Person alerts - limit to 10
        missing_person_alerts = []
        for entity_id, data in entity_events.items():
            timestamps = data['timestamps']

            for i in range(len(timestamps) - 1):
                gap = timestamps[i + 1] - timestamps[i]
                gap_start = timestamps[i]
                gap_end = timestamps[i + 1]

                actual_gap = gap

                current = gap_start
                sleeping_hours_to_subtract = timedelta(0)

                while current < gap_end:
                    next_day = current + timedelta(days=1)
                    next_midnight = timezone.make_aware(
                        datetime.combine(current.date() + timedelta(days=1), time_module.min))
                    next_7am = timezone.make_aware(
                        datetime.combine(current.date() + timedelta(days=1), time_module(7, 0)))

                    if current < next_midnight < gap_end:
                        sleep_start = next_midnight
                        sleep_end = min(next_7am, gap_end)

                        if sleep_end > sleep_start:
                            sleeping_hours_to_subtract += (sleep_end - sleep_start)

                    current = next_7am if next_7am < gap_end else gap_end

                actual_gap -= sleeping_hours_to_subtract

                if actual_gap >= gap_threshold:
                    gap_hours = actual_gap.total_seconds() / 3600
                    total_gap_hours = gap.total_seconds() / 3600
                    missing_person_alerts.append({
                        "alert_type": "Missing Person",
                        "severity": 10,
                        "message": f"{data['name']} had no activity for {gap_hours:.1f} hours (from {timestamps[i].strftime('%Y-%m-%d %H:%M')} to {timestamps[i + 1].strftime('%Y-%m-%d %H:%M')}, excluding sleeping hours).",
                        "details": {
                            "entity_id": str(entity_id),
                            "name": data['name'],
                            "gap_start": timestamps[i],
                            "gap_end": timestamps[i + 1],
                            "gap_hours": round(gap_hours, 1),
                            "total_gap_hours": round(total_gap_hours, 1)
                        },
                        "recommendation": "Investigate unusual absence pattern."
                    })

        all_alerts.extend(missing_person_alerts[:10])

        # Overcrowding alerts - limit to 10
        overcrowding_alerts = []
        for location_id, max_capacity in LOCATION_MAX_CAPACITY.items():
            overcrowded = models.OccupancyData.objects.filter(
                location_id=location_id,
                count__gt=max_capacity
            ).values('start_time', 'count').order_by('-count')[:10]

            for entry in overcrowded:
                overage_pct = ((entry['count'] - max_capacity) / max_capacity) * 100
                overcrowding_alerts.append({
                    "alert_type": "Overcrowding",
                    "severity": min(8, 5 + int(overage_pct / 20)),
                    "message": f"{location_id} was over capacity by {int(overage_pct)}% at {entry['start_time'].strftime('%Y-%m-%d %H:%M')}.",
                    "details": {
                        "location_name": location_id,
                        "current_count": entry['count'],
                        "max_capacity": max_capacity,
                        "timestamp": entry['start_time']
                    },
                    "recommendation": "Monitor area and redirect traffic."
                })

        all_alerts.extend(overcrowding_alerts[:10])

        # Access Violation alerts - limit to 10
        access_violation_alerts = []
        for location, allowed_roles in ACCESS_RULES.items():
            violations = models.Event.objects.filter(
                location=location,
                entity__role__isnull=False
            ).exclude(
                entity__role__in=allowed_roles
            ).select_related('entity').values(
                'entity__entity_id', 'entity__name', 'entity__role', 'timestamp', 'location'
            )[:50]

            for event in violations:
                access_violation_alerts.append({
                    "alert_type": "Access Violation",
                    "severity": 7,
                    "message": f"{event['entity__name']} ({event['entity__role']}) entered restricted area: {location}.",
                    "details": {
                        "entity_id": str(event['entity__entity_id']),
                        "name": event['entity__name'],
                        "role": event['entity__role'],
                        "location": location,
                        "timestamp": event['timestamp']
                    },
                    "recommendation": "Verify entity credentials. Dispatch security if necessary."
                })

        all_alerts.extend(access_violation_alerts[:10])

        # After Hours Access alerts - limit to 10
        after_hours_alerts = []
        after_hours_locations = ['Main Building', 'Library']
        after_hours_roles = ['staff', 'student']

        after_hours_events = models.Event.objects.filter(
            location__in=after_hours_locations,
            entity__role__in=after_hours_roles
        ).select_related('entity').values(
            'entity__entity_id', 'entity__name', 'entity__role', 'timestamp', 'location'
        )

        for event in after_hours_events:
            event_hour = event['timestamp'].hour
            if event_hour >= 22 or event_hour < 7:
                after_hours_alerts.append({
                    "alert_type": "After Hours Access",
                    "severity": 6,
                    "message": f"{event['entity__name']} ({event['entity__role']}) accessed {event['location']} during restricted hours at {event['timestamp'].strftime('%Y-%m-%d %H:%M')}.",
                    "details": {
                        "entity_id": str(event['entity__entity_id']),
                        "name": event['entity__name'],
                        "role": event['entity__role'],
                        "location": event['location'],
                        "timestamp": event['timestamp']
                    },
                    "recommendation": "Verify authorization for after-hours access."
                })

        all_alerts.extend(after_hours_alerts[:10])

        all_alerts.sort(key=lambda x: x['severity'], reverse=True)
        alerts_data = {"alerts": all_alerts, "count": len(all_alerts)}

        try:
            if os.environ.get("GEMINI_API_KEY"):
                recommender = GeminiAlertRecommender(model="gemini-2.0-flash")

                alerts_data = recommender.generate_recommendations(alerts_data)
            else:
                print("GEMINI_API_KEY not set. Skipping LLM recommendations.")

        except Exception as e:
            print(f"Error initializing or running GeminiAlertRecommender: {e}")

        return Response(alerts_data)


class TimelineDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @async_to_sync
    async def get(self, request, entity_id):
        if not await sync_to_async(models.Profile.objects.filter(entity_id=entity_id).exists)():
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        date_str = request.query_params.get('date')
        types = request.query_params.get("types")

        if not date_str:
            return Response({"error": "A 'date' query parameter (YYYY-MM-DD) is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time = timezone.make_aware(datetime.combine(target_date, time_module.min))
            end_time = timezone.make_aware(datetime.combine(target_date, time_module.max))
        except ValueError:
            return Response({"error": "Invalid date format. Please use YYYY-MM-DD."},
                            status=status.HTTP_44_BAD_REQUEST)

        summary_task = get_summary_for_entity(entity_id, start_time, end_time)

        async def get_timeline_data():
            @sync_to_async
            def fetch_and_serialize():
                ev_qs = models.Event.objects.filter(
                    entity__entity_id=entity_id,
                    timestamp__gte=start_time,
                    timestamp__lte=end_time
                )
                if types:
                    allowed = [t.strip() for t in types.split(",") if t.strip()]
                    if allowed:
                        ev_qs = ev_qs.filter(event_type__in=allowed)

                ev_qs = ev_qs.prefetch_related(
                    'entity', 'wifi_logs', 'card_swipes', 'cctv_frames',
                    'notes', 'lab_bookings', 'library_checkout',
                ).order_by("timestamp")

                serializer = serializers.TimelineEventSerializer(ev_qs, many=True)
                return serializer.data

            return await fetch_and_serialize()

        summary_result, timeline_result = await asyncio.gather(
            summary_task,
            get_timeline_data()
        )

        return Response({
            "summary": summary_result,
            "timeline": timeline_result
        })


class FaceSearchAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = serializers.FaceSearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        embedding = serializer.validated_data["embedding"]

        closest_face = models.FaceEmbedding.objects.annotate(
            distance=CosineDistance('embedding', embedding)
        ).order_by('distance').first()

        if closest_face and closest_face.distance < 0.4:
            profile_data = serializers.ProfileSerializer(closest_face.profile).data
            return Response({
                "match": True,
                "profile": profile_data,
                "distance": closest_face.distance
            })

        return Response({"match": False, "detail": "No confident match found."}, status=status.HTTP_404_NOT_FOUND)


class PredictionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        entity_id = request.data.get('entity_id')
        if not entity_id:
            return Response({"error": "entity_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            events_qs = models.Event.objects.filter(
                entity__entity_id=entity_id,
                location__isnull=False
            ).values('timestamp', 'location').order_by('timestamp')

            predictor = LocationPredictor()
            predicted_location, future_time, entity_df = predictor.train_and_predict(events_qs)

            if predicted_location is None:
                return Response({"error": "No location data found for this entity"}, status=status.HTTP_404_NOT_FOUND)

            explanation = get_prediction_explanation(entity_df, predicted_location, future_time)

            entity_df['timestamp'] = entity_df['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
            past_activities = entity_df[['timestamp', 'location']].to_dict(orient='records')

            return Response({
                "entity_id": entity_id,
                "predicted_location": predicted_location,
                "explanation": explanation,
                "past_activities": past_activities
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OccupancyAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = serializers.OccupancyRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        location_id = serializer.validated_data['location_id']
        future_time_aware = serializer.validated_data['future_time']

        try:
            historical_data_qs = models.OccupancyData.objects.filter(
                location_id=location_id
            ).order_by('start_time')

            if not historical_data_qs.exists():
                return Response({
                    "error": f"No historical occupancy data found for location: {location_id}"
                }, status=status.HTTP_404_NOT_FOUND)

            # This view continues to use the ORIGINAL OccupancyPredictor
            predictor = OccupancyPredictor()
            predicted_occupancy = predictor.train_and_predict(
                historical_data_qs,
                future_time_aware
            )

            status_label = get_occupancy_status(location_id, predicted_occupancy)

            df_full = pd.DataFrame(list(
                models.OccupancyData.objects.all().values('start_time', 'location_id', 'count')
            ))

            future_time_naive = future_time_aware.replace(tzinfo=None)

            explanation = get_occupancy_explanation(
                predicted_occupancy,
                df_full,
                location_id,
                future_time_naive
            )

            response_data = {
                "location_name": location_id,
                "future_time": future_time_naive,
                "predicted_occupancy": predicted_occupancy,
                "status": status_label,
                "explanation": explanation
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in OccupancyAPIView: {e}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"An internal server error occurred: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# NEW VIEW FOR BATCH PREDICTIONS
class OccupancyAllAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 1. Get future_time from request
        future_time_str = request.data.get('future_time')
        if not future_time_str:
            return Response({"error": "future_time is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Parse the ISO string from frontend
            future_time_aware = datetime.fromisoformat(future_time_str.replace("Z", "+00:00"))
        except ValueError:
            return Response({"error": "Invalid future_time format. Use ISO string."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            # 2. Fetch ALL occupancy data once
            all_data_qs = models.OccupancyData.objects.all().values('start_time', 'location_id', 'count')
            if not all_data_qs.exists():
                return Response({"error": "No occupancy data found in database."}, status=status.HTTP_404_NOT_FOUND)

            df_all = pd.DataFrame(list(all_data_qs))

            # 3. Get all locations from the capacity dictionary
            all_locations = LOCATION_MAX_CAPACITY.keys()
            results = []

            # 4. Initialize the NEW predictor with all data
            predictor = AllLocationsOccupancyPredictor(df_all)

            # 5. Loop and predict for each location
            for location_id in all_locations:
                # 6. Predict for the specific location using its data
                predicted_occupancy = predictor.predict_for_location(
                    location_id,
                    future_time_aware
                )

                # 7. Get its status
                status_label = get_occupancy_status(location_id, predicted_occupancy)

                # 8. Append the result
                results.append({
                    "location_name": location_id,
                    "predicted_occupancy": predicted_occupancy,
                    "status": status_label,
                })

            # 9. Return the full list of predictions
            return Response(results, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error in OccupancyAllAPIView: {e}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"An internal server error occurred: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)