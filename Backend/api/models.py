import uuid
from django.db import models
from django.db.models import Q, Index
from pgvector.django import VectorField

ROLE_CHOICES = [
    ("student", "Student"),
    ("faculty", "Faculty"),
    ("staff", "Staff")
]

EVENT_TYPE_CHOICES = [
    ("wifi_logs", "WiFiLogs"),
    ("cctv_frames", "CCTVFrames"),
    ("lab_booking", "LabBooking"),
    ("card_swipes", "CardSwipes"),
    ("library_checkouts", "LibraryCheckouts"),
    ("text_notes", "TextNotes")
]

class Profile(models.Model):
    entity_id = models.CharField(primary_key=True, max_length=32)
    name = models.CharField(max_length=108)
    role = models.CharField(choices=ROLE_CHOICES, max_length=21, default="student")
    email = models.EmailField(unique=True, null=True, blank=True)
    department = models.CharField(max_length=108, null=True, blank=True)

    student_id = models.CharField(max_length=108, null=True, blank=True)
    staff_id = models.CharField(max_length=108, null=True, blank=True)

    card_id = models.CharField(max_length=108, unique=True, null=True, blank=True)
    face_id = models.CharField(max_length=108, unique=True, null=True, blank=True)
    device_hash = models.CharField(max_length=108, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "profiles"
        constraints = [
            models.CheckConstraint(check=((models.Q(student_id__isnull=False) & models.Q(staff_id__isnull=True)) | (models.Q(student_id__isnull=True) & models.Q(staff_id__isnull=False))), name="either_student_or_faculty"),
            models.UniqueConstraint(fields=["student_id"], condition=models.Q(student_id__isnull=False), name="unique_student_id"),
            models.UniqueConstraint(fields=["staff_id"], condition=models.Q(staff_id__isnull=False), name="unique_staff_id"),
        ]

    def __str__(self):
        return f"{self.name} ({self.entity_id})"

class Event(models.Model):
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL, related_name="events")
    location = models.CharField(max_length=120, null=True, blank=True)
    timestamp = models.DateTimeField()
    confidence = models.FloatField(default=1)
    event_type = models.CharField(max_length=108, choices=EVENT_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "events"
        indexes = [
            models.Index(fields=["entity", "timestamp"]),
            models.Index(fields=["event_type", "timestamp"]),
            models.Index(fields=["timestamp"])
        ]

    def __str__(self):
        return f"{self.event_type} @ {self.timestamp.isoformat()}"

class WifiLogs(models.Model):
    id = models.AutoField(primary_key=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="wifi_logs")
    device_hash = models.CharField(max_length=108, null=True, blank=True)
    ap_id = models.CharField(max_length=108)
    timestamp = models.DateTimeField()

    class Meta:
        db_table = "wifi_logs"
        constraints = [
            models.UniqueConstraint(fields=["device_hash", "timestamp"], name="unique_wifi_timestamp")
        ]
        indexes = [
            Index(fields=["device_hash", "timestamp"]),
            Index(fields=["ap_id", "timestamp"])
        ]

    def __str__(self):
        return f"wifi:{self.device_hash}@{self.ap_id}@{self.timestamp.isoformat()}"

class CardSwipe(models.Model):
    id = models.AutoField(primary_key=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="card_swipes")
    card_id = models.CharField(max_length=108)
    location_id = models.CharField(max_length=108)
    timestamp = models.DateTimeField()

    class Meta:
        db_table = "card_swipes"
        constraints = [
            models.UniqueConstraint(fields=["card_id", "timestamp"], name="unique_card_swipe_id")
        ]
        indexes = [
            models.Index(fields=["card_id", "timestamp"]),
            Index(fields=["location_id", "timestamp"])
        ]

    def __str__(self):
        return f"card:{self.card_id}@{self.location_id}@{self.timestamp.isoformat()}"

class CCTVFrame(models.Model):
    frame_id = models.CharField(primary_key=True, max_length=64)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="cctv_frames")
    location_id = models.CharField(max_length=108, null=True, blank=True)
    timestamp = models.DateTimeField()
    face_id = models.CharField(max_length=108, null=True, blank=True)

    class Meta:
        db_table = "cctv_frames"
        indexes = [
            Index(fields=["face_id", "timestamp"]),
            Index(fields=["location_id", "timestamp"])
        ]

    def __str__(self):
        return f"frame:{self.frame_id} @ {self.location_id} ({self.timestamp.isoformat()})"

class Note(models.Model):
    note_id = models.CharField(primary_key=True, max_length=64)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="notes")
    entity = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="notes")
    category = models.CharField(max_length=64, null=True, blank=True)
    text = models.TextField()
    timestamp = models.DateTimeField()

    class Meta:
        db_table = "notes"
        indexes = [
            Index(fields=["entity", "timestamp"]),
        ]

    def __str__(self):
        return f"note:{self.note_id} ({self.category})"

class LabBooking(models.Model):
    booking_id = models.CharField(primary_key=True, max_length=64)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="lab_bookings")
    entity = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="lab_bookings")
    room_id = models.CharField(max_length=108)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    attended = models.BooleanField(default=True)

    class Meta:
        db_table = "lab_bookings"
        indexes = [
            Index(fields=["entity", "room_id", "start_time", "end_time", "attended"]),
        ]

    def __str__(self):
        return f"lab_booking:{self.booking_id} ({self.room_id})"

class LibraryCheckout(models.Model):
    checkout_id = models.CharField(primary_key=True, max_length=64)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="library_checkout")
    entity = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="library_checkout")
    book_id = models.CharField(max_length=108)
    timestamp = models.DateTimeField()

    class Meta:
        db_table = "library_checkouts"
        indexes = [
            Index(fields=["entity", "timestamp", "checkout_id", "book_id"]),
        ]

    def __str__(self):
        return f"library:{self.checkout_id} ({self.book_id})"

class FaceEmbedding(models.Model):
    face_id = models.CharField(primary_key=True, max_length=64)
    profile = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL, related_name="face_embeddings")
    embedding = VectorField(dimensions=512, null=True, blank=True)
    embedding_model = models.CharField(max_length=128, null=True, blank=True, default="InceptionResnetV1")

    class Meta:
        db_table = "face_embeddings"
        indexes = [
            Index(fields=["profile"]),
        ]

    def __str__(self):
        return f"face_embedding:{self.face_id} ({self.profile})"

class OccupancyData(models.Model):
    id = models.BigAutoField(primary_key=True)
    location_id = models.CharField(max_length=108, db_index=True)
    start_time = models.DateTimeField()
    count = models.PositiveIntegerField()

    class Meta:
        db_table = "occupancy_data"
        indexes = [
            models.Index(fields=["location_id", "start_time"]),
        ]
        unique_together = (("location_id", "start_time"),)
        ordering = ["location_id", "start_time"]

    def __str__(self):
        return f"{self.location_id} @ {self.start_time}: {self.count}"