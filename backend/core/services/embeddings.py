from functools import lru_cache

from django.conf import settings
from openai import OpenAI


@lru_cache(maxsize=1)
def _client():
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def embed_texts(texts):
    texts = list(texts)
    response = _client().embeddings.create(model=settings.EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


def embed_text(text):
    return embed_texts([text])[0]
