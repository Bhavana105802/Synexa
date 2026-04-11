import logging
from fastapi import APIRouter

from app.models.user_models import SignupRequest, LoginRequest, TokenResponse
from app.services.auth import signup_user, login_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    summary="Create a new user account",
    response_description="User created successfully",
)
async def signup(request: SignupRequest):
    result = await signup_user(request.email, request.password)
    return {"message": "Account created successfully.", **result}


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a JWT token",
)
async def login(request: LoginRequest):
    return await login_user(request.email, request.password)