from fastapi import APIRouter
from routers import auth, users

api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(users.router)
