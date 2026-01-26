from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login():
# ログイン処理
	pass

@router.post("/logout")
def logout():
    pass


