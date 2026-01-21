#!/usr/bin/env python3
from common.get_db import get_db
from common import models


def main() -> None:
	db_gen = get_db()
	db = next(db_gen)
	try:
		models.Base.metadata.create_all(bind=db.get_bind())
	finally:
		db_gen.close()


if __name__ == "__main__":
	main()
