from datetime import datetime
from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    id: int
    email: str
    is_active: bool | None = None
    is_superuser: bool | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: str
    password: str
    is_active: bool | None = None
    is_superuser: bool | None = None

class UserUpdate(BaseModel):
    email: str | None = None
    password: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None

# 一旦後回し。
class UserOut(BaseModel):
    id: int
    email: str
    is_active: bool | None = None
    is_superuser: bool | None = None

    model_config = ConfigDict(from_attributes=True)

