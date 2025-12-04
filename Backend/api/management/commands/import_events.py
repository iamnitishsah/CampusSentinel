import csv
import uuid
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from api.models import Event, Profile
from psycopg2.extras import execute_values

CHUNK_SIZE = 5000

class Command(BaseCommand):
    help = "Fast import events from CSV using psycopg2 execute_values"

    def add_arguments(self, parser):
        parser.add_argument("csvfile", type=str)

    def handle(self, *args, **options):
        path = options["csvfile"]
        self.stdout.write(self.style.WARNING("Deleting existing events..."))
        Event.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("Existing events deleted."))

        df = pd.read_csv(path)
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df['confidence']=df['confidence'].replace({
            '0.5' : '0.7'
        })
        df.loc[df['event_type'] == 'wifi_logs', 'confidence']= 0.7
        df = df.dropna(subset=["timestamp"])

        profiles = {str(p.entity_id): p.entity_id for p in Profile.objects.all()}
        allowed_event_types = {c[0] for c in Event._meta.get_field("event_type").choices}

        total = len(df)
        inserted = 0

        with connection.cursor() as cursor:
            for start in range(0, total, CHUNK_SIZE):
                chunk = df.iloc[start:start + CHUNK_SIZE]
                rows = []
                for _, row in chunk.iterrows():
                    event_type = str(row.get("event_type")).strip()
                    if event_type not in allowed_event_types:
                        continue

                    ts = row["timestamp"].to_pydatetime()
                    if timezone.is_naive(ts):
                        ts = timezone.make_aware(ts, timezone.get_default_timezone())

                    entity_id = row.get("entity_id")
                    profile_id = profiles.get(entity_id)

                    confidence = row.get("confidence", 1.0)
                    try:
                        confidence = float(confidence)
                    except Exception:
                        confidence = 1.0

                    rows.append((
                        str(uuid.uuid4()),  # event_id
                        profile_id,
                        row.get("location"),
                        ts,
                        confidence,
                        event_type,
                        timezone.now(),
                    ))

                execute_values(cursor, """
                                       INSERT INTO events (event_id, entity_id, location, timestamp, confidence,
                                                           event_type, created_at)
                                       VALUES %s
                                       """, rows)

                inserted += len(rows)
                self.stdout.write(f"Inserted {inserted}/{total} rows...")
                self.stdout.flush()

        self.stdout.write(self.style.SUCCESS(f"Done. Inserted {inserted} events total."))
