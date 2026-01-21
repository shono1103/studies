#!/usr/bin/env python3
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, inspect, text

from common.get_db import get_db
from Record_ls import lsRecord
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


def _prompt_record(engine, table_name: str) -> dict:
	inspector = inspect(engine)
	columns = inspector.get_columns(table_name)
	pk_columns = set(inspector.get_pk_constraint(table_name).get("constrained_columns", []))
	record = {}
	for column in columns:
		name = column["name"]
		if name in pk_columns and column.get("autoincrement", False):
			continue
		is_timestamp = isinstance(column["type"], DateTime)
		default_timestamp = None
		if is_timestamp:
			default_timestamp = datetime.utcnow()
			prompt = f"{name} [{default_timestamp.isoformat(timespec='seconds')}]: "
		else:
			prompt = f"{name}: "
		while True:
			raw_value = input(prompt).strip()
			if raw_value == "":
				if default_timestamp is not None:
					record[name] = default_timestamp
					break
				if column.get("nullable", False) or column.get("default") is not None:
					break
				print(f"value required: {name}")
				continue
			try:
				record[name] = _parse_value(raw_value, column["type"])
				break
			except ValueError:
				print(f"invalid value: {name}")
	return record


def insertRecord(table_name: str, record: dict) -> None:
	if not record:
		print("no record data")
		return
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		columns = ", ".join(f'"{column}"' for column in record.keys())
		placeholders = ", ".join(f":{column}" for column in record.keys())
		with engine.begin() as conn:
			conn.execute(
				text(f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders})'),
				record,
			)
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
		table_name = input("insert table name: ").strip()
		if table_name not in tables:
			print(f"table not found: {table_name}")
			return 1
		record = _prompt_record(engine, table_name)
	finally:
		db_gen.close()

	insertRecord(table_name, record)
	lsRecord(table_name)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
