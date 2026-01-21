#!/usr/bin/env python3
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, inspect, text

from common.get_db import get_db
from Table_ls import lsTable


def _parse_value(raw_value: str, column_type):
	if isinstance(column_type, Integer):
		return int(raw_value)
	if isinstance(column_type, Boolean):
		value = raw_value.lower()
		if value in {"true", "1", "yes", "y"}:
			return True
		if value in {"false", "0", "no", "n"}:
			return False
		raise ValueError("invalid boolean")
	if isinstance(column_type, DateTime):
		return datetime.fromisoformat(raw_value)
	return raw_value


def _print_rows(columns, rows) -> None:
	if not rows:
		print("no records found")
		return
	print("\t".join(columns))
	for row in rows:
		print("\t".join("" if value is None else str(value) for value in row))


def selectRecord(table_name: str, column_name: Optional[str], value) -> int:
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		columns = [col["name"] for col in inspect(engine).get_columns(table_name)]
		if not columns:
			print(f"no columns found: {table_name}")
			return 1
		with engine.connect() as conn:
			if column_name:
				result = conn.execute(
					text(f'SELECT * FROM "{table_name}" WHERE "{column_name}" = :value'),
					{"value": value},
				)
			else:
				result = conn.execute(text(f'SELECT * FROM "{table_name}"'))
			rows = result.fetchall()
		_print_rows(columns, rows)
		return 0
	finally:
		db_gen.close()


def main() -> int:
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		tables = lsTable(engine)
		if not tables:
			print("no tables found")
			return 1
		for table in tables:
			print(table)
		table_name = input("select table name: ").strip()
		if table_name not in tables:
			print(f"table not found: {table_name}")
			return 1
		columns = inspect(engine).get_columns(table_name)
		if not columns:
			print(f"no columns found: {table_name}")
			return 1
		column_map = {column["name"]: column["type"] for column in columns}
		column_name = input("select column name (blank for all): ").strip()
		if column_name == "":
			selected_column = None
			value = None
		else:
			if column_name not in column_map:
				print(f"column not found: {column_name}")
				return 1
			raw_value = input(f"value for {column_name}: ").strip()
			try:
				value = _parse_value(raw_value, column_map[column_name])
			except ValueError:
				print(f"invalid value: {column_name}")
				return 1
			selected_column = column_name
	finally:
		db_gen.close()

	return selectRecord(table_name, selected_column, value)


if __name__ == "__main__":
	raise SystemExit(main())
