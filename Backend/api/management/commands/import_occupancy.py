import csv
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.conf import settings
import pytz
from api.models import OccupancyData


class Command(BaseCommand):
    help = 'Import occupancy data from CSV file into PostgreSQL'

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_file',
            type=str,
            help='Path to the CSV file (e.g., occupancy_data.csv)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to insert per batch (default: 1000)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before import'
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        batch_size = options['batch_size']
        clear_data = options['clear']

        # Get timezone (use settings.TIME_ZONE or default to UTC)
        tz = pytz.timezone(settings.TIME_ZONE) if hasattr(settings, 'TIME_ZONE') else pytz.UTC
        self.stdout.write(f'Using timezone: {tz}')

        try:
            # Clear existing data if requested
            if clear_data:
                self.stdout.write(self.style.WARNING('Clearing existing occupancy data...'))
                deleted_count = OccupancyData.objects.all().delete()[0]
                self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} existing records'))

            # Read and parse CSV
            self.stdout.write(f'Reading CSV file: {csv_file}')
            records = []
            skipped = 0

            with open(csv_file, 'r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)

                for row_num, row in enumerate(csv_reader, start=2):  # start=2 because row 1 is header
                    try:
                        # Parse the datetime as naive
                        naive_dt = datetime.strptime(
                            row['start_time'].strip(),
                            '%d-%m-%Y %H:%M'
                        )

                        # Make it timezone-aware
                        start_time = tz.localize(naive_dt)

                        # Create OccupancyData instance
                        record = OccupancyData(
                            location_id=row['location_id'].strip(),
                            start_time=start_time,
                            count=int(row['count'].strip())
                        )
                        records.append(record)

                        # Bulk insert when batch size is reached
                        if len(records) >= batch_size:
                            self._bulk_insert(records)
                            self.stdout.write(f'Inserted {len(records)} records...')
                            records = []

                    except (ValueError, KeyError) as e:
                        skipped += 1
                        self.stdout.write(
                            self.style.WARNING(
                                f'Skipping row {row_num} due to error: {str(e)}'
                            )
                        )
                        continue

                # Insert remaining records
                if records:
                    self._bulk_insert(records)
                    self.stdout.write(f'Inserted final batch of {len(records)} records')

            # Summary
            total_imported = OccupancyData.objects.count()
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nImport completed successfully!\n'
                    f'Total records in database: {total_imported}\n'
                    f'Skipped rows: {skipped}'
                )
            )

        except FileNotFoundError:
            raise CommandError(f'CSV file not found: {csv_file}')
        except Exception as e:
            raise CommandError(f'Error during import: {str(e)}')

    @transaction.atomic
    def _bulk_insert(self, records):
        """Bulk insert records with conflict handling"""
        try:
            OccupancyData.objects.bulk_create(
                records,
                ignore_conflicts=True  # Skip duplicates based on unique_together constraint
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during bulk insert: {str(e)}')
            )
            raise