## dbのモデル定義
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from models.base import Base

### Messageクラス
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
