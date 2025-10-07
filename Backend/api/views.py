import asyncio
import httpx
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Max, Q
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from asgiref.sync import async_to_sync, sync_to_async
from . import models, serializers
from .summarizer import get_summary_for_entity


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



FASTAPI_URL = "http://localhost:8001/predict"
API_KEY = "ChaosCoded"

class AsyncModelProxyView(APIView):
    @async_to_sync
    async def post(self, request):
        payload = {"data": request.data}
        async with httpx.AsyncClient() as client:
            try:
                r = await client.post(FASTAPI_URL, json=payload, headers={"X-API-KEY": API_KEY}, timeout=10.0)
                r.raise_for_status()
            except httpx.RequestError as e:
                return Response({"error": "Model service unreachable", "detail": str(e)},
                                status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except httpx.HTTPStatusError as e:
                return Response({"error": "Error from model service", "detail": e.response.text},
                                status=e.response.status_code)

        return Response(r.json(), status=r.status_code)



class TimelineDetailAPIView(APIView):
    """
    Asynchronously retrieves an entity's timeline and generates a summary.
    Returns both the detailed event list and the AI-powered summary.
    """

    @async_to_sync
    async def get(self, request, entity_id):
        # 1. Validate Profile and Time Parameters
        if not await sync_to_async(models.Profile.objects.filter(entity_id=entity_id).exists)():
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        start_time_str = request.query_params.get('start_time')
        end_time_str = request.query_params.get('end_time')
        types = request.query_params.get("types")

        if not start_time_str or not end_time_str:
            return Response({"error": "Both 'start_time' and 'end_time' are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            start_time = timezone.make_aware(datetime.fromisoformat(start_time_str))
            end_time = timezone.make_aware(datetime.fromisoformat(end_time_str))
        except ValueError:
            return Response({"error": "Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 2. Define async tasks for summary and timeline serialization

        # Task for generating summary
        summary_task = get_summary_for_entity(entity_id, start_time, end_time)

        # Task for fetching and serializing the timeline
        async def get_timeline_data():
            # This function runs the synchronous DB query and serialization in an async-safe way
            @sync_to_async
            def fetch_and_serialize():
                ev_qs = models.Event.objects.filter(entity__entity_id=entity_id, timestamp__gte=start_time,
                                                    timestamp__lte=end_time)
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

        # 3. Run both tasks concurrently and wait for their results
        summary_result, timeline_result = await asyncio.gather(
            summary_task,
            get_timeline_data()
        )

        # 4. Return the combined response
        return Response({
            "summary": summary_result,
            "timeline": timeline_result
        })

