import ast
import pandas as pd
from tqdm import tqdm
from django.core.management.base import BaseCommand
from django.db import connection
from psycopg2.extras import execute_values

from api.models import Profile


class Command(BaseCommand):
    help = "Efficiently import Face Embeddings (with optional Profile linking)."

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to CSV file")

    def handle(self, *args, **options):
        csv_file = options["csv_file"]

        self.stdout.write(self.style.WARNING("Deleting existing face embeddings..."))
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM face_embeddings;")
        self.stdout.write(self.style.SUCCESS("✅ Existing face embeddings deleted."))

        df = pd.read_csv(csv_file)
        required = {"face_id", "embedding"}
        if not required.issubset(df.columns):
            missing = required - set(df.columns)
            self.stderr.write(f"❌ Missing required columns: {missing}")
            return

        def parse_embedding(val):
            try:
                emb = ast.literal_eval(val)
                if isinstance(emb, list) and len(emb) == 512:
                    return emb
            except (ValueError, SyntaxError):
                pass
            return None

        df["embedding"] = df["embedding"].apply(parse_embedding)
        df.dropna(subset=["embedding"], inplace=True)
        self.stdout.write(f"Loaded {len(df)} valid embeddings from CSV.")

        # --- THIS IS THE CORRECTED LINE ---
        # We fetch 'entity_id' (the primary key) instead of the non-existent 'id'.
        profile_map = dict(Profile.objects.values_list("face_id", "entity_id"))

        linked = 0
        rows = []
        for _, row in df.iterrows():
            fid = row["face_id"].replace(".jpg", "").strip()
            pid = profile_map.get(fid)
            if pid:
                linked += 1
            rows.append((fid, pid, str(row["embedding"]), "InceptionResnetV1"))  # Cast embedding to string for psycopg2

        self.stdout.write(f"Linking {linked} / {len(rows)} embeddings to existing profiles.")

        BATCH_SIZE = 500
        total = len(rows)
        self.stdout.write(f"Inserting {total} embeddings in batches of {BATCH_SIZE}...")

        insert_sql = """
                     INSERT INTO face_embeddings (face_id, profile_id, embedding, embedding_model)
                     VALUES %s \
                     """
        with connection.cursor() as cursor:
            for i in tqdm(range(0, total, BATCH_SIZE), desc="🚀 Inserting batches"):
                batch = rows[i:i + BATCH_SIZE]
                execute_values(cursor, insert_sql, batch, page_size=BATCH_SIZE)

        self.stdout.write(self.style.SUCCESS(f"✅ Successfully imported {total} embeddings!"))
        self.stdout.write(self.style.SUCCESS(f"🔗 {linked} embeddings linked to profiles."))
