import pandas as pd
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from psycopg2.extras import execute_values
from api.models import LibraryCheckout, Profile, Event

CHUNK_SIZE = 5000


class Command(BaseCommand):
    help = "Fast import of Library Checkouts from CSV and link with Profile + Event"

    def add_arguments(self, parser):
        parser.add_argument("csvfile", type=str)

    def handle(self, *args, **options):
        path = options["csvfile"]

        self.stdout.write(self.style.WARNING("Deleting existing library checkouts..."))
        LibraryCheckout.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing library checkouts deleted."))

        # Load CSV
        df = pd.read_csv(path)

        required_cols = {"checkout_id", "entity_id", "book_id", "timestamp"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            self.stderr.write(f"Missing required columns in CSV: {missing}")
            return

        # Parse timestamps
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.dropna(subset=["timestamp"])

        # Load profiles
        profiles = set(Profile.objects.values_list("entity_id", flat=True))
        self.stdout.write(f"Loaded {len(profiles)} profiles.")

        # Preload events by entity (sorted by time)
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
                    checkout_id = str(row.get("checkout_id") or "").strip()
                    entity_id = str(row.get("entity_id") or "").strip()
                    book_id = str(row.get("book_id") or "").strip()
                    timestamp = row["timestamp"].to_pydatetime()

                    if timezone.is_naive(timestamp):
                        timestamp = timezone.make_aware(timestamp)

                    if not checkout_id or not entity_id or entity_id not in profiles:
                        continue

                    # Find latest event before this timestamp
                    event_id = self._find_latest_event(entity_events.get(entity_id, []), timestamp)
                    if not event_id:
                        continue

                    rows.append((
                        checkout_id,
                        event_id,
                        entity_id,
                        book_id,
                        timestamp,
                    ))

                if rows:
                    execute_values(cursor, """
                        INSERT INTO library_checkouts
                        (checkout_id, event_id, entity_id, book_id, timestamp)
                        VALUES %s
                        ON CONFLICT (checkout_id) DO NOTHING
                    """, rows)
                    inserted += len(rows)

                self.stdout.write(f"Inserted {inserted}/{total} library checkouts...")
                self.stdout.flush()

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Inserted {inserted} library checkouts total."))

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
