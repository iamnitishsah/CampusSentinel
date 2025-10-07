from datetime import timedelta
from django.utils import timezone
from django.db.models import Max, Q
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from . import models, serializers


class ProfileViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing Profile instances.
    Provides `list`, `create`, `retrieve`, `update`, and `destroy` actions.
    """
    queryset = models.Profile.objects.all().order_by('name')
    serializer_class = serializers.ProfileSerializer
    lookup_field = 'entity_id'


class EntitySearchAPIView(generics.ListAPIView):
    serializer_class = serializers.ProfileSerializer

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        if not q:
            return models.Profile.objects.none()

        return models.Profile.objects.filter(
            Q(name__icontains=q) |
            Q(email__icontains=q) |
            Q(card_id__icontains=q) |
            Q(device_hash__icontains=q) |
            Q(face_id__icontains=q) |
            Q(entity_id__icontains=q) |
            Q(student_id__icontains=q) |
            Q(staff_id__icontains=q)
        ).order_by("name")[:50]


class ProfileDetailAPIView(generics.RetrieveAPIView):
    serializer_class = serializers.ProfileSerializer
    lookup_field = "entity_id"
    queryset = models.Profile.objects.all()

    def retrieve(self, request, *args, **kwargs):
        inst = self.get_object()
        data = self.get_serializer(inst).data
        last_seen = models.Event.objects.filter(entity=inst).aggregate(
            last_seen=Max("timestamp")
        )["last_seen"]
        data["last_seen"] = last_seen
        return Response(data)


class TimelineAPIView(APIView):
    def get(self, request, entity_id):
        # 1. First, efficiently check if the profile exists.
        if not models.Profile.objects.filter(entity_id=entity_id).exists():
            return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        types = request.query_params.get("types")

        # 2. Build the base queryset for Events, filtered by the entity.
        ev_qs = models.Event.objects.filter(entity__entity_id=entity_id)

        # 3. Apply optional filters.
        if start:
            ev_qs = ev_qs.filter(timestamp__gte=start)
        if end:
            ev_qs = ev_qs.filter(timestamp__lte=end)
        if types:
            allowed = [t.strip() for t in types.split(",") if t.strip()]
            if allowed:
                ev_qs = ev_qs.filter(event_type__in=allowed)

        # 4. Apply prefetching ON THE FINAL QUERYSET to solve the N+1 problem.
        ev_qs = ev_qs.prefetch_related(
            'entity',
            'wifi_logs',
            'card_swipes',
            'cctv_frames',
            'notes',
            'lab_bookings',
            'library_checkout',
        ).order_by("timestamp")

        # 5. Serialize the entire queryset at once.
        serializer = serializers.TimelineEventSerializer(ev_qs, many=True)
        return Response(serializer.data)


class AlertsListAPIView(APIView):
    """
    GET /api/alerts/
    Computes alerts for entities with no events for a specified duration.
    - `hours`: The number of hours to look back. Defaults to 12.
    """

    def get(self, request):
        try:
            threshold_hours = int(request.query_params.get("hours", 12))
        except (ValueError, TypeError):
            threshold_hours = 12

        cutoff = timezone.now() - timedelta(hours=threshold_hours)

        # Let the database do the filtering and aggregation in one go.
        alerts_qs = models.Profile.objects.annotate(
            last_seen=Max('events__timestamp')
        ).filter(
            last_seen__isnull=False,
            last_seen__lt=cutoff
        ).values(
            'entity_id', 'name', 'email', 'last_seen'
        ).order_by('last_seen')[:100]

        # Format the queryset results into the desired response structure
        alerts = [
            {
                "entity_id": alert['entity_id'],
                "name": alert['name'],
                "email": alert['email'],
                "last_seen": alert['last_seen'],
                "alert": f"No observation for > {threshold_hours} hours",
            }
            for alert in alerts_qs
        ]

        return Response({"alerts": alerts, "count": len(alerts)})




# class PredictLocationAPIView(APIView):
#     """
#     POST /api/entities/{entity_id}/predict_location/
#     Body: {"lookback_minutes": 60} (optional)
#     This view collects recent events for the entity and forwards them to the ML server,
#     which returns the predicted location and evidence. The ML server is expected to
#     implement the prediction logic.
#     """
#     def post(self, request, entity_id):
#         # validate entity exists
#         try:
#             profile = models.Profile.objects.get(entity_id=entity_id)
#         except models.Profile.DoesNotExist:
#             return Response({"detail": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
#
#         serializer = serializers.PredictLocationRequestSerializer(data={"entity_id": entity_id, **request.data})
#         serializer.is_valid(raise_exception=True)
#         lookback = serializer.validated_data.get("lookback_minutes", 360)
#
#         since = timezone.now() - timedelta(minutes=lookback)
#         ev_qs = models.Event.objects.filter(entity=profile, timestamp__gte=since).order_by("-timestamp")[:200]
#
#         events_payload = []
#         for ev in ev_qs:
#             events_payload.append({
#                 "event_id": ev.event_id,
#                 "event_type": ev.event_type,
#                 "timestamp": ev.timestamp.isoformat(),
#                 "location": ev.location,
#                 "confidence": ev.confidence,
#             })
#
#         # call ML service
#         try:
#             ml_resp = call_ml_predict_location(entity_id, events_payload)
#         except Exception as e:
#             return Response({"detail": f"Location service error: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
#
#         # expected ml_resp: {"location": "LIB", "score": 0.78, "evidence": [...]}
#         return Response(ml_resp)
#
