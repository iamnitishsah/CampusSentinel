# Create this file: yourapp/management/commands/convert_ist_to_utc.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import pytz
from api import models  # Replace 'yourapp' with your actual app name


class Command(BaseCommand):
    help = 'Convert all timestamp fields from IST to UTC'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without actually changing it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        ist = pytz.timezone('Asia/Kolkata')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Convert Event timestamps
        self.stdout.write('Converting Event timestamps...')
        events = models.Event.objects.all()
        event_count = 0

        for event in events:
            if event.timestamp:
                # Treat the naive datetime as IST and convert to UTC
                if timezone.is_naive(event.timestamp):
                    # Make it aware as IST
                    ist_time = ist.localize(event.timestamp)
                    # Convert to UTC
                    utc_time = ist_time.astimezone(pytz.UTC)

                    if not dry_run:
                        event.timestamp = utc_time
                        event.save(update_fields=['timestamp'])

                    event_count += 1
                    if event_count % 1000 == 0:
                        self.stdout.write(f'  Processed {event_count} events...')

        self.stdout.write(self.style.SUCCESS(f'Converted {event_count} Event records'))

        # Convert OccupancyData timestamps
        self.stdout.write('Converting OccupancyData timestamps...')
        occupancy_data = models.OccupancyData.objects.all()
        occupancy_count = 0

        for occ in occupancy_data:
            if occ.start_time:
                if timezone.is_naive(occ.start_time):
                    ist_time = ist.localize(occ.start_time)
                    utc_time = ist_time.astimezone(pytz.UTC)

                    if not dry_run:
                        occ.start_time = utc_time
                        occ.save(update_fields=['start_time'])

                    occupancy_count += 1
                    if occupancy_count % 1000 == 0:
                        self.stdout.write(f'  Processed {occupancy_count} occupancy records...')

        self.stdout.write(self.style.SUCCESS(f'Converted {occupancy_count} OccupancyData records'))

        # Add any other models with timestamp fields here
        # For example, if you have created_at, updated_at fields in other models

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN COMPLETE - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('All timestamps converted from IST to UTC successfully!'))