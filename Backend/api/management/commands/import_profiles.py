import csv
from django.core.management.base import BaseCommand
from api.models import Profile

class Command(BaseCommand):
    help = "Bulk import profiles from a CSV file into the Profile model."

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help="Path to the CSV file to import.")

    def handle(self, *args, **options):
        file_path = options['csv_file']
        self.stdout.write(self.style.NOTICE(f"Importing profiles from {file_path}..."))

        with open(file_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            objs = []
            for row in reader:
                objs.append(Profile(
                    entity_id=row['entity_id'],
                    name=row['name'],
                    role=row.get('role', 'student') or 'student',
                    email=row.get('email') or None,
                    department=row.get('department') or None,
                    student_id=row.get('student_id') or None,
                    staff_id=row.get('staff_id') or None,
                    card_id=row.get('card_id') or None,
                    device_hash=row.get('device_hash') or None,
                    face_id=row.get('face_id') or None,
                ))

            Profile.objects.bulk_create(objs, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f"✅ Imported {len(objs)} profiles successfully."))


