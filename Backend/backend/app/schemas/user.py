"""
User schemas for request/response validation.
"""
from pydantic import BaseModel, ConfigDict


class UserLogin(BaseModel):
    """Schema for login request."""
    username: str
    password: str


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    username: str
    password: str


class UserRead(BaseModel):
    """Schema for reading user data (without password)."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    is_active: bool


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"
