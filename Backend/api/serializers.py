from rest_framework import serializers
from . import models


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Profile
        fields = [
            "entity_id",
            "name",
            "role",
            "email",
            "department",
            "student_id",
            "staff_id",
            "card_id",
            "face_id",
            "device_hash",
            "created_at",
        ]

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Event
        fields = [
            "event_id",
            "entity",
            "event_type",
            "location",
            "timestamp",
            "confidence",
            "created_at",
        ]

class WifiLogsSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.WifiLogs
        fields = ["id", "event", "device_hash", "ap_id", "timestamp"]

class CardSwipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CardSwipe
        fields = ["id", "event", "card_id", "location_id", "timestamp"]

class CCTVFrameSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CCTVFrame
        fields = ["frame_id", "event", "location_id", "timestamp", "face_id", "raw"]

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Note
        fields = [
            "note_id",
            "event",
            "entity",
            "category",
            "text",
            "timestamp",
            "embedding_model",
        ]

class LabBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.LabBooking
        fields = [
            "booking_id",
            "event",
            "entity",
            "room_id",
            "start_time",
            "end_time",
            "attended",
            "raw",
        ]

class LibraryCheckoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.LibraryCheckout
        fields = [
            "checkout_id",
            "event",
            "entity",
            "book_id",
            "timestamp",
            "raw",
        ]

class FaceEmbeddingSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.FaceEmbedding
        fields = ["face_id", "profile", "embedding_model", "created_at"]

class TimelineEventSerializer(serializers.Serializer):
    event_id = serializers.CharField()
    event_type = serializers.CharField()
    timestamp = serializers.DateTimeField()
    location = serializers.CharField(allow_null=True, required=False)
    confidence = serializers.FloatField()
    created_at = serializers.DateTimeField()
    entity = ProfileSerializer(read_only=True)

    wifi_logs = WifiLogsSerializer(many=True, read_only=True)
    card_swipes = CardSwipeSerializer(many=True, read_only=True)
    cctv_frames = CCTVFrameSerializer(many=True, read_only=True)
    notes = NoteSerializer(many=True, read_only=True)
    lab_bookings = LabBookingSerializer(many=True, read_only=True)
    library_checkout = LibraryCheckoutSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        rep = {
            "event_id": instance.event_id,
            "event_type": instance.event_type,
            "timestamp": instance.timestamp,
            "location": instance.location,
            "confidence": instance.confidence,
            "created_at": instance.created_at,
            "entity": ProfileSerializer(instance.entity).data if instance.entity else None,
        }

        try:
            rep["wifi_logs"] = WifiLogsSerializer(instance.wifi_logs.all(), many=True).data
        except Exception:
            rep["wifi_logs"] = []

        try:
            rep["card_swipes"] = CardSwipeSerializer(instance.card_swipes.all(), many=True).data
        except Exception:
            rep["card_swipes"] = []

        try:
            rep["cctv_frames"] = CCTVFrameSerializer(instance.cctv_frames.all(), many=True).data
        except Exception:
            rep["cctv_frames"] = []

        try:
            rep["notes"] = NoteSerializer(instance.notes.all(), many=True).data
        except Exception:
            rep["notes"] = []

        try:
            rep["lab_bookings"] = LabBookingSerializer(instance.lab_bookings.all(), many=True).data
        except Exception:
            rep["lab_bookings"] = []

        try:
            rep["library_checkout"] = LibraryCheckoutSerializer(instance.library_checkout.all(), many=True).data
        except Exception:
            rep["library_checkout"] = []

        return rep

class EntitySearchSerializer(serializers.Serializer):
    q = serializers.CharField()

class SemanticSearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField()
    top_k = serializers.IntegerField(default=5, min_value=1, max_value=100)

class PredictLocationRequestSerializer(serializers.Serializer):
    entity_id = serializers.CharField()
    lookback_minutes = serializers.IntegerField(default=60, min_value=1)