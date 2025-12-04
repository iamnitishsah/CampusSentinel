import pandas as pd
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from psycopg2.extras import execute_values
from api.models import CardSwipe, Profile, Event

CHUNK_SIZE = 5000


class Command(BaseCommand):
    help = "Fast import of Card Swipe logs and link them to Events via card_id → Profile → Event"

    def add_arguments(self, parser):
        parser.add_argument("csvfile", type=str)

    def handle(self, *args, **options):
        path = options["csvfile"]

        self.stdout.write(self.style.WARNING("Deleting existing card swipe logs..."))
        CardSwipe.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing card swipe logs deleted."))

        # Read the CSV in chunks
        df = pd.read_csv(path)
        required_cols = {"card_id", "location_id", "timestamp"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            self.stderr.write(f"Missing required columns in CSV: {missing}")
            return

        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.dropna(subset=["timestamp"])

        # Map card_id → entity_id (Profile)
        profiles = Profile.objects.exclude(card_id__isnull=True).values_list("card_id", "entity_id")
        card_to_entity = {cid: eid for cid, eid in profiles}
        self.stdout.write(f"Loaded {len(card_to_entity)} profiles with card IDs.")

        # Map entity_id → [(event_timestamp, event_id)]
        events = (
            Event.objects.exclude(entity=None)
            .values_list("entity__entity_id", "event_id", "timestamp")
        )

        entity_events = {}
        for entity_id, event_id, ts in events:
            entity_events.setdefault(entity_id, []).append((ts, event_id))

        # Sort events per entity for binary search
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

                    card_id = str(row.get("card_id") or "").strip()
                    location_id = str(row.get("location_id") or "").strip()
                    if not card_id or not location_id:
                        continue

                    entity_id = card_to_entity.get(card_id)
                    if not entity_id:
                        continue

                    event_id = self._find_latest_event(entity_events.get(entity_id, []), ts)
                    if not event_id:
                        continue

                    rows.append((event_id, card_id, location_id, ts))

                if rows:
                    execute_values(cursor, """
                        INSERT INTO card_swipes (event_id, card_id, location_id, timestamp)
                        VALUES %s
                        ON CONFLICT (card_id, timestamp) DO NOTHING
                    """, rows)
                    inserted += len(rows)

                self.stdout.write(f"Inserted {inserted}/{total} rows...")
                self.stdout.flush()

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Inserted {inserted} card swipe logs total."))

    def _find_latest_event(self, events_list, ts):
        """Binary search for latest event <= timestamp"""
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