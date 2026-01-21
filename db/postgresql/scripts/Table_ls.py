#!/usr/bin/env python3
import sys

from sqlalchemy import inspect

from common.get_db import get_db


def lsTable(engine):
	inspector = inspect(engine)
	tables = inspector.get_table_names()
	return tables

def main() -> int:
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		tables = lsTable(engine)
		if not tables:
			print("tables are nothing")
			return 0
		else:
			for table in tables:
				print(table)
			return 0

	finally:
		db_gen.close()


if __name__ == "__main__":
	raise SystemExit(main())
