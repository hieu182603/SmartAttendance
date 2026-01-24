"""Authentication utilities for API security"""
import os
import jwt
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Header, Depends
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

class UserPrincipal:
    """User principal containing authentication information"""
    def __init__(self, user_id: str, role: str, department_id: Optional[str] = None):
        self.user_id = user_id
        self.role = role
        self.department_id = department_id

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> UserPrincipal:
    """Verify JWT token and return user principal"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Accept both 'sub' and 'userId' fields for compatibility
        user_id: str = payload.get("sub") or payload.get("userId")
        # Normalize role to lowercase for consistent comparison
        role: str = payload.get("role", "").lower()
        department_id: Optional[str] = payload.get("department_id")

        if user_id is None or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user information"
            )

        return UserPrincipal(user_id=user_id, role=role, department_id=department_id)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(authorization: Optional[str] = Header(None, alias="Authorization")) -> UserPrincipal:
    """
    Dependency to get current authenticated user from JWT token

    Expected header format: "Bearer <token>"
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )

    return verify_token(token)

# Backward compatibility for API key authentication
async def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> UserPrincipal:
    """
    Legacy API key authentication for backward compatibility
    In production, this should be replaced with JWT tokens
    """
    expected_key = os.getenv("API_KEY")

    # Check for explicit development override
    allow_insecure_auth = os.getenv("ALLOW_INSECURE_AUTH", "false").lower() == "true"

    if not expected_key:
        if allow_insecure_auth:
            logger.warning("API_KEY not set but ALLOW_INSECURE_AUTH=true - allowing all requests with default user")
            # Return a default admin user for development
            return UserPrincipal(user_id="dev_user", role="admin", department_id=None)
        else:
            logger.error("API_KEY not set and ALLOW_INSECURE_AUTH not enabled - denying all requests")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required"
            )

    if not x_api_key:
        logger.warning("API key missing from request")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )

    if x_api_key != expected_key:
        logger.warning(f"Invalid API key attempt from {x_api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    # For API key authentication, return a default admin user
    # In production, API keys should be associated with specific users
    return UserPrincipal(user_id="api_user", role="admin", department_id=None)
