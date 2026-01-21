#!/usr/bin/env python3
from sqlalchemy import text

from common.get_db import get_db
from Table_ls import lsTable



def main() -> int:
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		tables = lsTable(engine)
		if not tables:
			print("no tables found")
			return 1
		else:
			for table in tables:
				print(table)
			table_name = input("drop table name: ").strip()
			if table_name not in tables:
				print(f"table not found: {table_name}")
				return 1
			with engine.begin() as conn:
				conn.execute(text(f'DROP TABLE "{table_name}"'))
			print(f"dropped: {table_name}")
			return 0
	finally:
		db_gen.close()


if __name__ == "__main__":
	raise SystemExit(main())
