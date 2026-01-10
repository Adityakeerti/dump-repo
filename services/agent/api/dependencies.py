# api/dependencies.py

from api.middleware.auth import extract_user_context, get_optional_user_context, UserContext
from typing import Optional

# Re-export for convenience
__all__ = ["extract_user_context", "get_optional_user_context", "UserContext"]

