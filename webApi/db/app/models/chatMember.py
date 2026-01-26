## dbのモデル定義
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from models.base import Base

### ChatMemberクラス
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
