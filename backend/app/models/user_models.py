from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class SignupRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    password: str = Field(..., min_length=6, example="secret123")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    password: str = Field(..., example="secret123")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT bearer token")
    token_type: str = Field(default="bearer")
    user_id: str = Field(..., description="Unique user identifier")


class UserInDB(BaseModel):
    id: str
    email: str
    hashed_password: str
    created_at: datetime