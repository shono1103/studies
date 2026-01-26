from fastapi import FastAPI
from common.depend import get_db
from routers.router import api


# webAPI定義
from contextlib import asynccontextmanager
from models.base import Base
# モデルを先に読み込み、relationshipの参照先を登録する
import models.chatMember  # noqa: F401
import models.chatRoom  # noqa: F401
import models.message  # noqa: F401
import models.user  # noqa: F401

def initDb():
	db_gen = get_db()
	db = next(db_gen)
	try:
		Base.metadata.create_all(bind=db.get_bind())
	finally:
		db_gen.close()


#　起動時処理・終了時処理
@asynccontextmanager
async def lifespan(app: FastAPI):
	# ===== 起動時処理 =====
	print("startup: 初期化処理を実行")
	initDb()

	yield

	# ===== 終了時処理 =====
	print("shutdown: 後処理を実行")

app = FastAPI(lifespan=lifespan)
app.include_router(api)
