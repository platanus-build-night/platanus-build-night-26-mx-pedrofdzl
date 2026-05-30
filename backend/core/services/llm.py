from functools import lru_cache

from anthropic import Anthropic
from django.conf import settings


@lru_cache(maxsize=1)
def anthropic_client():
    return Anthropic(api_key=settings.ANTHROPIC_API_KEY)
