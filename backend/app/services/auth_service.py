"""
Authentication Service - JWT + robust PBKDF2 password hashing with Demo User support
"""
import uuid
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
try:
    import jwt
    JWTError = jwt.PyJWTError
except ImportError:
    from jose import JWTError, jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.database import get_db
from app.models.user import User

settings = get_settings()
# auto_error=False allows optional auth for frictionless MSE demonstration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

DEMO_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
SALT = b"researchmind_secure_salt_2026"


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 (standard library, robust across all Python versions)."""
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), SALT, 100000)
    return key.hex()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored hash."""
    key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), SALT, 100000)
    return hmac.compare_digest(key.hex(), hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_or_create_demo_user(db: AsyncSession) -> User:
    """Ensure a default Demo Researcher user exists for frictionless testing/demo."""
    result = await db.execute(select(User).where(User.id == DEMO_USER_ID))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=DEMO_USER_ID,
            email="researcher@researchmind.ai",
            name="Demo Researcher",
            password_hash=hash_password("demo1234"),
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current user from JWT token, or fallback to Demo Researcher
    for MSE presentation mode.
    """
    if not token or token == "demo-token" or token == "null":
        return await get_or_create_demo_user(db)

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            return await get_or_create_demo_user(db)
        user_id = uuid.UUID(user_id_str)
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.is_active:
            return user
    except Exception:
        pass

    # Fallback to demo user for smooth presentation
    return await get_or_create_demo_user(db)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
