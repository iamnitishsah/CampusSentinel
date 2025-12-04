import pandas as pd
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from psycopg2.extras import execute_values
from api.models import CCTVFrame, Profile, Event

CHUNK_SIZE = 5000


class Command(BaseCommand):
    help = "Fast import of CCTV frames and link them to Events via face_id → Profile → Event"

    def add_arguments(self, parser):
        parser.add_argument("csvfile", type=str)

    def handle(self, *args, **options):
        path = options["csvfile"]

        self.stdout.write(self.style.WARNING("Deleting existing CCTV frames..."))
        CCTVFrame.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing CCTV frames deleted."))

        # Read CSV file
        df = pd.read_csv(path)
        required_cols = {"frame_id", "location_id", "timestamp", "face_id"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            self.stderr.write(f"Missing required columns in CSV: {missing}")
            return

        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.dropna(subset=["timestamp"])

        # Load face_id → entity_id mapping
        profiles = Profile.objects.exclude(face_id__isnull=True).values_list("face_id", "entity_id")
        face_to_entity = {fid: eid for fid, eid in profiles}
        self.stdout.write(f"Loaded {len(face_to_entity)} profiles with face IDs.")

        # Preload events per entity
        events = (
            Event.objects.exclude(entity=None)
            .values_list("entity__entity_id", "event_id", "timestamp")
        )

        entity_events = {}
        for entity_id, event_id, ts in events:
            entity_events.setdefault(entity_id, []).append((ts, event_id))

        # Sort events for efficient lookup
        for eid in entity_events:
            entity_events[eid].sort(key=lambda x: x[0])

        total = len(df)
        inserted = 0

        with connection.cursor() as cursor:
            for start in range(0, total, CHUNK_SIZE):
                chunk = df.iloc[start:start + CHUNK_SIZE]
                rows = []

                for _, row in chunk.iterrows():
                    ts = row["timestamp"].to_pydatetime()
                    if timezone.is_naive(ts):
                        ts = timezone.make_aware(ts, timezone.get_default_timezone())

                    frame_id = str(row.get("frame_id") or "").strip()
                    face_id = str(row.get("face_id") or "").strip()
                    location_id = str(row.get("location_id") or "").strip()

                    if not frame_id or not face_id:
                        continue

                    entity_id = face_to_entity.get(face_id)
                    if not entity_id:
                        continue

                    event_id = self._find_latest_event(entity_events.get(entity_id, []), ts)
                    if not event_id:
                        continue

                    rows.append((frame_id, event_id, location_id or None, ts, face_id))

                if rows:
                    execute_values(cursor, """
                        INSERT INTO cctv_frames (frame_id, event_id, location_id, timestamp, face_id)
                        VALUES %s
                        ON CONFLICT (frame_id) DO NOTHING
                    """, rows)
                    inserted += len(rows)

                self.stdout.write(f"Inserted {inserted}/{total} frames...")
                self.stdout.flush()

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Inserted {inserted} CCTV frames total."))

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
