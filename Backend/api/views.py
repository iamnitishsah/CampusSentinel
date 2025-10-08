import time
import asyncio
from datetime import datetime, timedelta, time
from django.utils import timezone
from django.db.models import Max, Q
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from asgiref.sync import async_to_sync, sync_to_async
from . import models, serializers
from pgvector.django import CosineDistance
from .summarizer import get_summary_for_entity
from .prediction import LocationPredictor
from .explanation import get_prediction_explanation


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = models.Profile.objects.all().order_by('name')
    serializer_class = serializers.ProfileSerializer
    lookup_field = 'entity_id'


class EntitySearchAPIView(generics.ListAPIView):
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
    def get(self, request):
        try:
            threshold_hours = int(request.query_params.get("hours", 12))
        except (ValueError, TypeError):
            threshold_hours = 12
        cutoff = timezone.now() - timedelta(hours=threshold_hours)
        alerts_qs = models.Profile.objects.annotate(last_seen=Max('events__timestamp')).filter(
            last_seen__isnull=False, last_seen__lt=cutoff
        ).values('entity_id', 'name', 'email', 'last_seen').order_by('last_seen')[:100]
        alerts = [{
            "entity_id": a['entity_id'], "name": a['name'], "email": a['email'],
            "last_seen": a['last_seen'], "alert": f"No observation for > {threshold_hours} hours",
        } for a in alerts_qs]
        return Response({"alerts": alerts, "count": len(alerts)})


class TimelineDetailAPIView(APIView):
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
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)