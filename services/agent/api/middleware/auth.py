# api/middleware/auth.py

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
import jwt
import base64
from datetime import datetime

from config.settings import settings


security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


class UserContext:
    """User context extracted from JWT token"""
    def __init__(self, user_id: str, email: str, role: str, full_name: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.full_name = full_name or email
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name
        }


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate JWT token using shared secret from backend-ai.
    Returns decoded claims if valid, raises HTTPException if invalid.
    
    Note: backend-ai stores the secret as BASE64 in application.yml and decodes it.
    We need to decode it from BASE64 to get the raw bytes for HMAC-SHA.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # First, decode the token header to see what algorithm it uses (without verification)
        unverified_header = jwt.get_unverified_header(token)
        token_algorithm = unverified_header.get("alg", "HS384")  # Default to HS384 if not specified
        logger.info(f"Token algorithm: {token_algorithm}")
        
        # Decode the BASE64 secret to bytes (matching backend-ai's Decoders.BASE64.decode)
        # backend-ai uses: byte[] keyBytes = Decoders.BASE64.decode(secret);
        secret_bytes = None
        try:
            secret_bytes = base64.b64decode(settings.jwt_secret)
            logger.debug("Successfully decoded JWT secret from BASE64")
        except Exception as e:
            # If decoding fails, try using the secret directly (for backward compatibility)
            logger.warning(f"BASE64 decode failed, trying direct: {str(e)}")
            secret_bytes = settings.jwt_secret.encode('utf-8') if isinstance(settings.jwt_secret, str) else settings.jwt_secret
        
        # Build algorithms list - MUST include the detected algorithm first
        # PyJWT requires the algorithms parameter to include the algorithm from the token header
        allowed_algorithms = [token_algorithm]  # Start with detected algorithm
        
        # Add other supported HMAC-SHA algorithms if not already included
        for alg in ["HS384", "HS256", "HS512"]:
            if alg not in allowed_algorithms:
                allowed_algorithms.append(alg)
        
        logger.info(f"Attempting to decode with algorithms: {allowed_algorithms}")
        
        decoded = jwt.decode(
            token,
            secret_bytes,
            algorithms=allowed_algorithms,  # Support all HMAC-SHA algorithms
            options={"verify_signature": True, "verify_exp": True}
        )
        logger.info(f"Successfully decoded JWT token for user: {decoded.get('sub', 'unknown')}")
        return decoded
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAlgorithmError as e:
        logger.error(f"JWT algorithm error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token algorithm: {str(e)}. Token uses algorithm that is not allowed.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        # Log the error for debugging
        logger.error(f"JWT decode error: {str(e)}, token algorithm: {token_algorithm if 'token_algorithm' in locals() else 'unknown'}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def extract_user_context(credentials: HTTPAuthorizationCredentials = Security(security)) -> UserContext:
    """
    Extract user context from JWT token.
    Used as FastAPI dependency for protected routes.
    """
    token = credentials.credentials
    claims = decode_jwt_token(token)
    
    # Extract user information from JWT claims
    # backend-ai uses email as subject (username)
    email = claims.get("sub") or claims.get("username") or claims.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract role from claims (if available) or default to STUDENT
    # Note: backend-ai JWT currently only includes email as subject, not role
    # Role will be enriched from user_context in request body if available
    role = claims.get("role") or claims.get("authorities", [])
    if isinstance(role, list) and len(role) > 0:
        # Extract role from "ROLE_STUDENT" format
        role_str = role[0] if isinstance(role[0], str) else str(role[0])
        role = role_str.replace("ROLE_", "").upper()
    elif isinstance(role, str):
        role = role.replace("ROLE_", "").upper()
    else:
        # Default to STUDENT if not in JWT (will be enriched from user_context if available)
        role = "STUDENT"
    
    # Use email as user_id for MongoDB (consistent with backend-ai JWT subject)
    # This ensures user_id is always available even if user_id claim is missing
    user_id = claims.get("user_id") or claims.get("id") or email
    
    # Extract full name if available
    full_name = claims.get("fullName") or claims.get("full_name") or claims.get("name")
    
    return UserContext(
        user_id=str(user_id),
        email=email,
        role=role,
        full_name=full_name
    )


def get_optional_user_context(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security)
) -> Optional[UserContext]:
    """
    Extract user context from JWT token, but allow None for optional authentication.
    Used for routes that work with or without authentication.
    """
    if credentials is None:
        return None
    
    try:
        return extract_user_context(credentials)
    except HTTPException:
        return None

