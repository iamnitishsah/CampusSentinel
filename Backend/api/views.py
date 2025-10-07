from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.db.models import Max, Q

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response

from . import models, serializers


class EntitySearchAPIView(generics.ListAPIView):
    serializer_class = serializers.ProfileSerializer

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        if not q:
            return models.Profile.objects.none()
        qs = models.Profile.objects.filter(
            Q(name__icontains=q) |
            Q(email__icontains=q) |
            Q(card_id__icontains=q) |
            Q(device_hash__icontains=q) |
            Q(face_id__icontains=q) |
            Q(entity_id__icontains=q) |
            Q(student_id__icontains=q) |
            Q(staff_id__icontains=q)
        ).order_by("name")[:50]
        return qs


class ProfileDetailAPIView(generics.RetrieveAPIView):
    serializer_class = serializers.ProfileSerializer
    lookup_field = "entity_id"
    queryset = models.Profile.objects.all()

    def retrieve(self, request, *args, **kwargs):
        inst = self.get_object()
        data = self.get_serializer(inst).data
        last = models.Event.objects.filter(entity=inst).aggregate(last_seen=Max("timestamp"))["last_seen"]
        data["last_seen"] = last
        return Response(data)


class TimelineAPIView(APIView):
    def get(self, request, entity_id):
        try:
            profile = models.Profile.objects.get(entity_id=entity_id)
        except models.Profile.DoesNotExist:
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        types = request.query_params.get("types")

        ev_qs = models.Event.objects.filter(entity=profile)
        if start:
            ev_qs = ev_qs.filter(timestamp__gte=start)
        if end:
            ev_qs = ev_qs.filter(timestamp__lte=end)
        if types:
            allowed = [t.strip() for t in types.split(",") if t.strip()]
            if allowed:
                ev_qs = ev_qs.filter(event_type__in=allowed)

        ev_qs = ev_qs.order_by("timestamp")
        results = [serializers.TimelineEventSerializer(ev).data for ev in ev_qs]
        return Response(results)


#
# Predict location endpoint (calls external ML)
#
class PredictLocationAPIView(APIView):
    """
    POST /api/entities/{entity_id}/predict_location/
    Body: {"lookback_minutes": 60} (optional)
    This view collects recent events for the entity and forwards them to the ML server,
    which returns the predicted location and evidence. The ML server is expected to
    implement the prediction logic.
    """
    def post(self, request, entity_id):
        # validate entity exists
        try:
            profile = models.Profile.objects.get(entity_id=entity_id)
        except models.Profile.DoesNotExist:
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = serializers.PredictLocationRequestSerializer(data={"entity_id": entity_id, **request.data})
        serializer.is_valid(raise_exception=True)
        lookback = serializer.validated_data.get("lookback_minutes", 360)

        since = timezone.now() - timedelta(minutes=lookback)
        ev_qs = models.Event.objects.filter(entity=profile, timestamp__gte=since).order_by("-timestamp")[:200]

        events_payload = []
        for ev in ev_qs:
            events_payload.append({
                "event_id": ev.event_id,
                "event_type": ev.event_type,
                "timestamp": ev.timestamp.isoformat(),
                "location": ev.location,
                "confidence": ev.confidence,
            })

        # call ML service
        try:
            ml_resp = call_ml_predict_location(entity_id, events_payload)
        except Exception as e:
            return Response({"detail": f"Location service error: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        # expected ml_resp: {"location": "LIB", "score": 0.78, "evidence": [...]}
        return Response(ml_resp)





class AlertsListAPIView(APIView):
    """
    GET /api/alerts/
    For hackathon scope we compute simple alerts:
      - Entities with no events for > 12 hours but had activity earlier (possible missing)
    """
    def get(self, request):
        threshold_hours = int(request.query_params.get("hours", 12))
        cutoff = timezone.now() - timedelta(hours=threshold_hours)

        recent = models.Event.objects.values("entity").annotate(last_seen=Max("timestamp"))
        alerts = []
        for row in recent:
            entity_id = row["entity"]
            last_seen = row["last_seen"]
            if last_seen and last_seen < cutoff:
                alerts.append({
                    "entity_id": entity_id,
                    "last_seen": last_seen,
                    "alert": f"No observation for > {threshold_hours} hours",
                })
        # optionally join profile details (light)
        # unique-ify by entity_id
        # limit to top 100 alerts
        alerts = alerts[:100]
        return Response({"alerts": alerts, "count": len(alerts)})