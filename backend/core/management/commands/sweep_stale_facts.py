from django.core.management.base import BaseCommand

from core.services.freshness import sweep_stale_facts


class Command(BaseCommand):
    help = "Mark facts past their review date stale and open dated issues."

    def handle(self, *args, **options):
        result = sweep_stale_facts()
        self.stdout.write(
            self.style.SUCCESS(
                f"Marked {result['stale']} fact(s) stale, opened {result['issues']} issue(s)."
            )
        )
