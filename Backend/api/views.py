import time
import asyncio
import pandas as pd
from datetime import time
from django.db.models.functions import RowNumber
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
from .occupancy_predictor import OccupancyPredictor
from .occupancy_explainer import get_occupancy_explanation


SIMULATION_NOW = timezone.make_aware(datetime(2025, 9, 25, 23, 59, 59))

LOCATION_MAX_CAPACITY = {
    'Admin Lobby': 600,
    'Auditorium': 300,
    'Hostel': 2300,
    'LAB_102': 15,
    'LAB': 25,
    'Library': 1000,
    'Seminar Room': 100,
    'WORKSHOP': 15,
    'LAB_305': 100,
    'Gym': 500,
    'LAB_101': 130,
    'Cafeteria': 700,
    'LAB_A2': 8,
    'LAB_A1': 180,
    'Main Building': 300,
    'Faculty Office': 500
}

ACCESS_RULES = {
    'Faculty Office': ['faculty', 'staff'],
    'LAB_305': ['faculty', 'student'],
    'Hostel': ['student']
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
        try:
            hours_param = int(request.query_params.get("hours", 12))
        except (ValueError, TypeError):
            hours_param = 12

        gap_threshold = timedelta(hours=hours_param)

        # Get all events ordered by entity and timestamp
        events = models.Event.objects.filter(
            entity__isnull=False
        ).select_related('entity').order_by('entity_id', 'timestamp').values(
            'entity_id', 'entity__name', 'entity__email', 'timestamp'
        )

        # Group events by entity
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

        # Find gaps for each entity
        for entity_id, data in entity_events.items():
            timestamps = data['timestamps']

            # Check consecutive timestamps for gaps
            for i in range(len(timestamps) - 1):
                gap = timestamps[i + 1] - timestamps[i]

                if gap >= gap_threshold:
                    gap_hours = gap.total_seconds() / 3600
                    all_alerts.append({
                        "alert_type": "Missing Person",
                        "severity": 10,
                        "message": f"{data['name']} had no activity for {gap_hours:.1f} hours (from {timestamps[i].strftime('%Y-%m-%d %H:%M')} to {timestamps[i + 1].strftime('%Y-%m-%d %H:%M')}).",
                        "details": {
                            "entity_id": str(entity_id),
                            "name": data['name'],
                            "gap_start": timestamps[i],
                            "gap_end": timestamps[i + 1],
                            "gap_hours": round(gap_hours, 1)
                        },
                        "recommendation": "Investigate unusual absence pattern."
                    })

        # Overcrowding alerts - find all times capacity was exceeded
        for location_id, max_capacity in LOCATION_MAX_CAPACITY.items():
            overcrowded = models.OccupancyData.objects.filter(
                location_id=location_id,
                count__gt=max_capacity
            ).values('start_time', 'count').order_by('-count')[:10]

            for entry in overcrowded:
                overage_pct = ((entry['count'] - max_capacity) / max_capacity) * 100
                all_alerts.append({
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

        # Access violations - find all violations
        for location, allowed_roles in ACCESS_RULES.items():
            violations = models.Event.objects.filter(
                location=location,
                entity__role__isnull=False
            ).exclude(
                entity__role__in=allowed_roles
            ).select_related('entity').values(
                'entity__entity_id', 'entity__name', 'entity__role', 'timestamp'
            )[:50]

            for event in violations:
                all_alerts.append({
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

        all_alerts.sort(key=lambda x: x['severity'], reverse=True)
        return Response({"alerts": all_alerts[:100], "count": len(all_alerts)})


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
            start_time = timezone.make_aware(datetime.combine(target_date, time.min))
            end_time = timezone.make_aware(datetime.combine(target_date, time.max))
        except ValueError:
            return Response({"error": "Invalid date format. Please use YYYY-MM-DD."},
                            status=status.HTTP_400_BAD_REQUEST)

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