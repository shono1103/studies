## dbのモデル定義
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from models.base import Base

### ChatRoomクラス
class ChatRoom(Base):
	__tablename__ = "chat_rooms"
	
	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False)
	is_direct = Column(Boolean, default=False, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

	members = relationship("ChatMember", back_populates="room", cascade="all, delete-orphan")
	messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")
