#!/usr/bin/env python3
from sqlalchemy import inspect, text

from common.get_db import get_db
from Table_ls import lsTable


def lsRecord(table_name: str) -> None:
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		columns = [col["name"] for col in inspect(engine).get_columns(table_name)]
		if not columns:
			print(f"no columns found: {table_name}")
			return
		with engine.connect() as conn:
			result = conn.execute(text(f'SELECT * FROM "{table_name}"'))
			rows = result.fetchall()
		if not rows:
			print("no records found")
			return
		print("\t".join(columns))
		for row in rows:
			print("\t".join("" if value is None else str(value) for value in row))
	finally:
		db_gen.close()


def main() -> None:
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		tables = lsTable(engine)
		if not tables:
			print("no tables found")
			return
		for table in tables:
			print(table)
		table_name = input("list table name: ").strip()
		if table_name not in tables:
			print(f"table not found: {table_name}")
			return
	finally:
		db_gen.close()

	lsRecord(table_name)


if __name__ == "__main__":
	main()
