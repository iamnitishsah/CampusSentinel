import pandas as pd
import json
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from psycopg2.extras import execute_values
from api.models import LabBooking, Profile, Event

CHUNK_SIZE = 5000


class Command(BaseCommand):
    help = "Fast import of LabBookings from CSV and link with Profile + Event"

    def add_arguments(self, parser):
        parser.add_argument("csvfile", type=str)

    def handle(self, *args, **options):
        path = options["csvfile"]

        self.stdout.write(self.style.WARNING("Deleting existing lab bookings..."))
        LabBooking.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing lab bookings deleted."))

        # Load CSV
        df = pd.read_csv(path)

        if "attended" not in df.columns and "attended (YES/NO)" in df.columns:
            df.rename(columns={"attended (YES/NO)": "attended"}, inplace=True)

        required_cols = {"booking_id", "entity_id", "room_id", "start_time", "end_time", "attended"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            self.stderr.write(f"Missing required columns in CSV: {missing}")
            return

        # Parse timestamps
        df["start_time"] = pd.to_datetime(df["start_time"], errors="coerce")
        df["end_time"] = pd.to_datetime(df["end_time"], errors="coerce")
        df = df.dropna(subset=["start_time", "end_time"])

        # Normalize attended column (YES/NO → Boolean)
        df["attended"] = df["attended"].astype(str).str.strip().str.upper().map({"YES": True, "NO": False})
        df["attended"].fillna(True, inplace=True)

        # Load profiles
        profile_ids = set(Profile.objects.values_list("entity_id", flat=True))
        self.stdout.write(f"Loaded {len(profile_ids)} profiles.")

        # Preload events by entity
        events = (
            Event.objects.exclude(entity=None)
            .values_list("entity__entity_id", "event_id", "timestamp")
        )

        entity_events = {}
        for entity_id, event_id, ts in events:
            entity_events.setdefault(entity_id, []).append((ts, event_id))
        for eid in entity_events:
            entity_events[eid].sort(key=lambda x: x[0])

        total = len(df)
        inserted = 0

        with connection.cursor() as cursor:
            for start in range(0, total, CHUNK_SIZE):
                chunk = df.iloc[start:start + CHUNK_SIZE]
                rows = []

                for _, row in chunk.iterrows():
                    booking_id = str(row.get("booking_id") or "").strip()
                    entity_id = str(row.get("entity_id") or "").strip()
                    room_id = str(row.get("room_id") or "").strip()
                    attended = bool(row.get("attended", True))
                    start_time = row["start_time"].to_pydatetime()
                    end_time = row["end_time"].to_pydatetime()

                    if timezone.is_naive(start_time):
                        start_time = timezone.make_aware(start_time)
                    if timezone.is_naive(end_time):
                        end_time = timezone.make_aware(end_time)

                    if not booking_id or not entity_id or entity_id not in profile_ids:
                        continue

                    # Link to latest event before booking start time
                    event_id = self._find_latest_event(entity_events.get(entity_id, []), start_time)
                    if not event_id:
                        continue

                    rows.append((booking_id, event_id, entity_id, room_id, start_time, end_time, attended))

                if rows:
                    execute_values(cursor, """
                        INSERT INTO lab_bookings
                        (booking_id, event_id, entity_id, room_id, start_time, end_time, attended)
                        VALUES %s
                        ON CONFLICT (booking_id) DO NOTHING
                    """, rows)
                    inserted += len(rows)

                self.stdout.write(f"Inserted {inserted}/{total} lab bookings...")
                self.stdout.flush()

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Inserted {inserted} lab bookings total."))

    def _find_latest_event(self, events_list, ts):
        """Binary search for latest event <= timestamp."""
        if not events_list:
            return None
        left, right = 0, len(events_list) - 1
        best = None
        while left <= right:
            mid = (left + right) // 2
            event_ts, event_id = events_list[mid]
            if event_ts <= ts:
                best = event_id
                left = mid + 1
            else:
                right = mid - 1
        return best
