from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
	__tablename__ = "users"

	id = Column(Integer, primary_key=True, index=True)
	email = Column(String(255), unique=True, index=True, nullable=False)
	hashed_password = Column(String(255), nullable=False)
	is_active = Column(Boolean, default=True, nullable=False)
	is_superuser = Column(Boolean, default=False, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	chat_memberships = relationship("ChatMember", back_populates="user", cascade="all, delete-orphan")
	messages = relationship("Message", back_populates="sender", cascade="all, delete-orphan")


class ChatRoom(Base):
	__tablename__ = "chat_rooms"

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False)
	is_direct = Column(Boolean, default=False, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	members = relationship("ChatMember", back_populates="room", cascade="all, delete-orphan")
	messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")


class ChatMember(Base):
	__tablename__ = "chat_members"

	id = Column(Integer, primary_key=True, index=True)
	room_id = Column(Integer, ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	role = Column(String(50), default="member", nullable=False)
	joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	last_read_at = Column(DateTime, nullable=True)

	room = relationship("ChatRoom", back_populates="members")
	user = relationship("User", back_populates="chat_memberships")


class Message(Base):
	__tablename__ = "messages"

	id = Column(Integer, primary_key=True, index=True)
	room_id = Column(Integer, ForeignKey("chat_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
	sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
	body = Column(Text, nullable=False)
	is_system = Column(Boolean, default=False, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	room = relationship("ChatRoom", back_populates="messages")
	sender = relationship("User", back_populates="messages")
