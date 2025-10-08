from django.contrib import admin
from .models import (
    Profile,
    Event,
    WifiLogs,
    CardSwipe,
    CCTVFrame,
    Note,
    LabBooking,
    LibraryCheckout,
    FaceEmbedding,
)


class FaceEmbeddingInline(admin.TabularInline):
    model = FaceEmbedding
    extra = 0
    fields = ("face_id", "embedding_model", "embedding")
    readonly_fields = ("face_id", "embedding_model")
    show_change_link = True


class EventInline(admin.TabularInline):
    model = Event
    extra = 0
    fields = ("event_type", "location", "timestamp", "confidence")
    readonly_fields = ("timestamp",)
    show_change_link = True


class WifiLogsInline(admin.TabularInline):
    model = WifiLogs
    extra = 0
    fields = ("device_hash", "ap_id", "timestamp")
    readonly_fields = ("timestamp",)
    show_change_link = True


class CardSwipeInline(admin.TabularInline):
    model = CardSwipe
    extra = 0
    fields = ("card_id", "location_id", "timestamp")
    readonly_fields = ("timestamp",)
    show_change_link = True


class CCTVFrameInline(admin.TabularInline):
    model = CCTVFrame
    extra = 0
    fields = ("frame_id", "location_id", "timestamp", "face_id")
    readonly_fields = ("timestamp",)
    show_change_link = True


class NoteInline(admin.TabularInline):
    model = Note
    extra = 0
    fields = ("note_id", "category", "text", "timestamp")
    readonly_fields = ("timestamp",)
    show_change_link = True


class LabBookingInline(admin.TabularInline):
    model = LabBooking
    extra = 0
    fields = ("booking_id", "room_id", "start_time", "end_time", "attended")
    readonly_fields = ("start_time", "end_time")
    show_change_link = True


class LibraryCheckoutInline(admin.TabularInline):
    model = LibraryCheckout
    extra = 0
    fields = ("checkout_id", "book_id", "timestamp")
    readonly_fields = ("timestamp",)
    show_change_link = True


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
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
    )
    search_fields = (
        "entity_id",
        "name",
        "email",
        "student_id",
        "staff_id",
        "card_id",
        "face_id",
        "device_hash",
    )
    list_filter = ("role", "department")
    readonly_fields = ("created_at",)
    inlines = [FaceEmbeddingInline, EventInline]
    ordering = ("name",)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("short_event_id", "get_entity", "event_type", "location", "timestamp", "confidence", "created_at")
    search_fields = ("event_id", "location", "entity__name", "entity__student_id", "entity__staff_id")
    list_filter = ("event_type",)
    date_hierarchy = "timestamp"
    inlines = [WifiLogsInline, CardSwipeInline, CCTVFrameInline, NoteInline, LabBookingInline, LibraryCheckoutInline]
    readonly_fields = ("created_at",)
    ordering = ("-timestamp",)
    autocomplete_fields = ("entity",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("entity")

    def get_entity(self, obj):
        if obj.entity:
            return f"{obj.entity.name} ({obj.entity.entity_id})"
        return None
    get_entity.short_description = "Profile"

    def short_event_id(self, obj):
        return str(obj.event_id)[:8]
    short_event_id.short_description = "Event"


@admin.register(WifiLogs)
class WifiLogsAdmin(admin.ModelAdmin):
    list_display = ("id", "device_hash", "ap_id", "timestamp", "get_event")
    search_fields = ("device_hash", "ap_id", "event__event_id")
    list_filter = ("ap_id",)
    date_hierarchy = "timestamp"
    readonly_fields = ()
    raw_id_fields = ("event",)

    def get_event(self, obj):
        return str(obj.event.event_id) if obj.event else None
    get_event.short_description = "Event"


@admin.register(CardSwipe)
class CardSwipeAdmin(admin.ModelAdmin):
    list_display = ("id", "card_id", "location_id", "timestamp", "get_event")
    search_fields = ("card_id", "location_id", "event__event_id")
    date_hierarchy = "timestamp"
    raw_id_fields = ("event",)

    def get_event(self, obj):
        return str(obj.event.event_id) if obj.event else None
    get_event.short_description = "Event"


@admin.register(CCTVFrame)
class CCTVFrameAdmin(admin.ModelAdmin):
    list_display = ("frame_id", "location_id", "timestamp", "face_id", "get_event")
    search_fields = ("frame_id", "face_id", "location_id", "event__event_id")
    date_hierarchy = "timestamp"
    raw_id_fields = ("event",)

    def get_event(self, obj):
        return str(obj.event.event_id) if obj.event else None
    get_event.short_description = "Event"


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("note_id", "entity", "category", "timestamp", "short_text")
    search_fields = ("note_id", "text", "entity__name", "entity__entity_id")
    date_hierarchy = "timestamp"
    raw_id_fields = ("event", "entity")

    def short_text(self, obj):
        return (obj.text[:75] + "...") if obj.text and len(obj.text) > 75 else obj.text
    short_text.short_description = "Text (preview)"


@admin.register(LabBooking)
class LabBookingAdmin(admin.ModelAdmin):
    list_display = ("booking_id", "entity", "room_id", "start_time", "end_time", "attended")
    search_fields = ("booking_id", "entity__name", "room_id")
    list_filter = ("room_id", "attended")
    date_hierarchy = "start_time"
    raw_id_fields = ("event", "entity")
    actions = ("mark_attended", "mark_unattended")

    def mark_attended(self, request, queryset):
        updated = queryset.update(attended=True)
        self.message_user(request, f"Marked {updated} booking(s) as attended.")
    mark_attended.short_description = "Mark selected bookings as attended"

    def mark_unattended(self, request, queryset):
        updated = queryset.update(attended=False)
        self.message_user(request, f"Marked {updated} booking(s) as not attended.")
    mark_unattended.short_description = "Mark selected bookings as not attended"


@admin.register(LibraryCheckout)
class LibraryCheckoutAdmin(admin.ModelAdmin):
    list_display = ("checkout_id", "entity", "book_id", "timestamp")
    search_fields = ("checkout_id", "book_id", "entity__name", "entity__entity_id")
    date_hierarchy = "timestamp"
    raw_id_fields = ("event", "entity")


@admin.register(FaceEmbedding)
class FaceEmbeddingAdmin(admin.ModelAdmin):
    list_display = ("face_id", "profile", "embedding_model", "embedding_preview")
    search_fields = ("face_id", "profile__name", "profile__entity_id", "embedding_model")
    raw_id_fields = ("profile",)
    readonly_fields = ()

    def embedding_preview(self, obj):
        # Keep preview brief; embedding can be large. If None, show placeholder.
        if not obj.embedding:
            return "(no embedding)"
        # obj.embedding may be a list-like; show first 6 values to give an idea.
        try:
            vals = list(obj.embedding)[:6]
            return "[" + ", ".join(f"{v:.3f}" for v in vals) + ", ...]"
        except Exception:
            return "(embedding)"
    embedding_preview.short_description = "Embedding (preview)"