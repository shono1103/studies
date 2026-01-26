from fastapi import APIRouter, Header, HTTPException, status, Depends
from pydantic import BaseModel
from common.depend import get_db
from models.user import User
from schemas.user import UserResponse, UserCreate, UserOut, UserUpdate
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


router = APIRouter(prefix="/users", tags=["auth"])


@router.get("/", response_model=list[UserResponse])
def getUserList(db: Session=Depends(get_db)):
	users = db.execute(select(User)).scalars().all()
	return users

@router.post("/", response_model=UserResponse, status_code= status.HTTP_201_CREATED)
def registerUser(payload: UserCreate, db: Session = Depends(get_db) ):
	user = User.createUser(userCreate=payload)
	db.add(user)
	try:
		db.commit()
	except IntegrityError:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="Email already registered",
		)
	return user

# @router.get("/{user_id}")
# def getUserDetail():
# 	pass

# @router.patch("/{user_id}")
# def editUserDetail():
# 	pass

# @router.delete("/{user_id}")
# def deleteUser():
# 	pass
