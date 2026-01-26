## dbのモデル定義
from datetime import datetime
from typing import Callable, Optional
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from models.base import Base
from common.security import hash_password
from schemas.user import UserCreate

### Userクラス
class User(Base):
	# クラスインスタンスを生成する情報源となるdbテーブル名
	__tablename__ = "users"

	id = Column(Integer, primary_key=True, index=True)
	email = Column(String(255), unique=True, index=True, nullable=False)
	hashed_password = Column(String(255), nullable=False)
	is_active = Column(Boolean, default=True, nullable=False)
	is_superuser = Column(Boolean, default=False, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	# cascade="all, delete-orphan"はusersテーブルが削除されたときにその関連テーブルも削除することを示す。
	chat_memberships = relationship("ChatMember", back_populates="user", cascade="all, delete-orphan")
	messages = relationship("Message", back_populates="sender", cascade="all, delete-orphan")

	@classmethod
	def createUser(
		cls,
		*,
		userCreate: UserCreate
	) -> "User":


		return cls(
			email=userCreate.email,
			hashed_password=hash_password(userCreate.password),
			is_active=True if userCreate.is_active is None else userCreate.is_active,
			is_superuser=False if userCreate.is_superuser is None else userCreate.is_superuser,
		)
		
