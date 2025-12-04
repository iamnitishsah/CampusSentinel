import pandas as pd
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from api.models import WifiLogs, Event, Profile
from psycopg2.extras import execute_values

CHUNK_SIZE = 5000


class Command(BaseCommand):
    help = "Fast import Wi-Fi logs linked to Events via Profile.device_hash"

    def add_arguments(self, parser):
        parser.add_argument("csvfile", type=str, help="Path to Wi-Fi logs CSV file")

    def handle(self, *args, **options):
        path = options["csvfile"]

        self.stdout.write(self.style.WARNING("Deleting existing Wi-Fi logs..."))
        WifiLogs.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing Wi-Fi logs deleted."))

        df = pd.read_csv(path)
        required_cols = {"device_hash", "ap_id", "timestamp"}
        if not required_cols.issubset(df.columns):
            missing = required_cols - set(df.columns)
            self.stderr.write(f"❌ Missing required columns in CSV: {missing}")
            return

        # Clean + normalize
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.dropna(subset=["timestamp"])
        df["device_hash"] = df["device_hash"].astype(str).str.strip()
        df["ap_id"] = df["ap_id"].astype(str).str.strip()

        # Map: device_hash → entity_id
        profile_map = dict(Profile.objects.exclude(device_hash=None)
                           .values_list("device_hash", "entity_id"))
        if not profile_map:
            self.stderr.write("❌ No profiles found with device_hash — cannot link logs.")
            return

        # Map: entity_id → latest event_id (closest event in time)
        event_map = {}
        events = (Event.objects
                  .values_list("entity__entity_id", "event_id", "timestamp")
                  .order_by("entity__entity_id", "-timestamp"))

        for entity_id, event_id, ts in events:
            # keep latest event for each entity
            if entity_id not in event_map:
                event_map[entity_id] = event_id

        if not event_map:
            self.stderr.write("❌ No events found — cannot link logs.")
            return

        total = len(df)
        inserted = 0

        with connection.cursor() as cursor:
            for start in range(0, total, CHUNK_SIZE):
                chunk = df.iloc[start:start + CHUNK_SIZE]
                rows = []

                for _, row in chunk.iterrows():
                    device_hash = row["device_hash"]
                    ap_id = row["ap_id"]
                    ts = row["timestamp"]

                    if not device_hash or not ap_id:
                        continue

                    entity_id = profile_map.get(device_hash)
                    if not entity_id:
                        continue

                    event_id = event_map.get(entity_id)
                    if not event_id:
                        continue

                    if timezone.is_naive(ts):
                        ts = timezone.make_aware(ts, timezone.get_default_timezone())

                    rows.append((event_id, device_hash, ap_id, ts))

                if not rows:
                    continue

                execute_values(cursor, """
                    INSERT INTO wifi_logs (event_id, device_hash, ap_id, timestamp)
                    VALUES %s
                    ON CONFLICT (device_hash, timestamp) DO NOTHING
                """, rows)

                inserted += len(rows)
                self.stdout.write(f"Inserted {inserted}/{total} rows...")
                self.stdout.flush()

        self.stdout.write(self.style.SUCCESS(f"✅ Done. Inserted {inserted} Wi-Fi logs total."))