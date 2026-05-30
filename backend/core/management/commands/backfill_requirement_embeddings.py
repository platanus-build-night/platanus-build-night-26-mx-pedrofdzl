from django.core.management.base import BaseCommand

from core.models import Requirement
from core.services.embeddings import embed_texts


class Command(BaseCommand):
    help = "Embed requirements that have no embedding yet."

    def add_arguments(self, parser):
        parser.add_argument("--batch", type=int, default=100)

    def handle(self, *args, **options):
        batch = options["batch"]
        total = 0
        while True:
            chunk = list(Requirement.objects.filter(embedding__isnull=True)[:batch])
            if not chunk:
                break
            for req, vector in zip(chunk, embed_texts([r.text for r in chunk]), strict=False):
                req.embedding = vector
            Requirement.objects.bulk_update(chunk, ["embedding"])
            total += len(chunk)
            self.stdout.write(f"Embedded {total} requirements...")
        self.stdout.write(self.style.SUCCESS(f"Done. {total} requirements embedded."))
