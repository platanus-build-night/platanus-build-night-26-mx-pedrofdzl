from anthropic import AnthropicError
from openai import OpenAIError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Map upstream LLM/embedding failures to a 502 instead of a raw 500."""
    if isinstance(exc, (AnthropicError, OpenAIError)):
        return Response(
            {"detail": "The AI service is temporarily unavailable. Please retry."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    return exception_handler(exc, context)
