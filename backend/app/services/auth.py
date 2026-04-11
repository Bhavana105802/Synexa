import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.services.database import get_users_collection

logger = logging.getLogger(__name__)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer()


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=getattr(settings, "JWT_EXPIRE_MINUTES", 1440)
    )
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(
        payload,
        getattr(settings, "JWT_SECRET", "change-me"),
        algorithm=getattr(settings, "JWT_ALGORITHM", "HS256"),
    )


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            getattr(settings, "JWT_SECRET", "change-me"),
            algorithms=[getattr(settings, "JWT_ALGORITHM", "HS256")],
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload.")
        return user_id
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalid or expired: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    return decode_token(credentials.credentials)


async def signup_user(email: str, password: str) -> dict:
    import uuid
    from datetime import timezone

    col = get_users_collection()

    existing = await col.find_one({"email": email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await col.insert_one({
        "_id": user_id,
        "email": email.lower(),
        "hashed_password": hash_password(password),
        "created_at": now,
    })

    logger.info(f"[Auth] New user signed up: {email}")
    return {"user_id": user_id, "email": email.lower()}


async def login_user(email: str, password: str) -> dict:
    col = get_users_collection()
    user = await col.find_one({"email": email.lower()})

    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(user["_id"])
    logger.info(f"[Auth] Login: {email}")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["_id"],
    }