from django.core.management.base import BaseCommand
import datetime
from django.db import transaction
from django.utils.timezone import make_aware
from api.models import Event, CardSwipe, CCTVFrame, WifiLogs, Note, LabBooking, LibraryCheckout

class Command(BaseCommand):
    help = 'Delete 36-hour events for 20 random entities ending at 2025-09-25 11:59:00'

    def handle(self, *args, **kwargs):
        end_time = make_aware(datetime.datetime(2025, 9, 25, 11, 59, 0))
        start_time = end_time - datetime.timedelta(hours=36)

        with transaction.atomic():
            random_entity_ids = (
                Event.objects
                .filter(timestamp__range=(start_time, end_time))
                .values_list('entity_id', flat=True)
                .distinct()
                .order_by('?')[:20]
            )

            events_to_delete = Event.objects.filter(
                entity_id__in=random_entity_ids,
                timestamp__range=(start_time, end_time)
            )

            print("Events to delete:", events_to_delete.values_list('event_id', 'entity_id', 'timestamp'))

            # Delete dependent tables
            CardSwipe.objects.filter(event__in=events_to_delete).delete()
            CCTVFrame.objects.filter(event__in=events_to_delete).delete()
            WifiLogs.objects.filter(event__in=events_to_delete).delete()
            Note.objects.filter(event__in=events_to_delete).delete()
            LabBooking.objects.filter(event__in=events_to_delete).delete()
            LibraryCheckout.objects.filter(event__in=events_to_delete).delete()

            deleted_count, _ = events_to_delete.delete()
            print(f"Deleted {deleted_count} events for 20 random entities.")
