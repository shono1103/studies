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


def _prompt_pk_values(columns, pk_columns) -> dict:
	pk_values = {}
	column_map = {column["name"]: column["type"] for column in columns}
	for column_name in pk_columns:
		raw_value = input(f"primary key value for {column_name}: ").strip()
		if raw_value == "":
			print(f"value required: {column_name}")
			return {}
		try:
			pk_values[column_name] = _parse_value(raw_value, column_map[column_name])
		except ValueError:
			print(f"invalid value: {column_name}")
			return {}
	return pk_values


def _fetch_record(engine, table_name: str, pk_values: dict):
	where_clause = " AND ".join(f'"{name}" = :{name}' for name in pk_values.keys())
	with engine.connect() as conn:
		result = conn.execute(
			text(f'SELECT * FROM "{table_name}" WHERE {where_clause}'),
			pk_values,
		)
		return result.fetchone()


def _prompt_update_data(columns, pk_columns, row) -> dict:
	update_data = {}
	for column in columns:
		name = column["name"]
		if name in pk_columns:
			continue
		current_value = row._mapping.get(name)
		if isinstance(current_value, datetime):
			display = current_value.isoformat(timespec="seconds")
		else:
			display = "" if current_value is None else str(current_value)
		prompt = f"{name} [{display}]: " if display != "" else f"{name}: "
		raw_value = input(prompt).strip()
		if raw_value == "":
			continue
		try:
			update_data[name] = _parse_value(raw_value, column["type"])
		except ValueError:
			print(f"invalid value: {name}")
			return {}
	return update_data


def updateRecord(table_name: str, pk_values: dict, update_data: dict) -> int:
	if not update_data:
		print("no update data")
		return 1
	db_gen = get_db()
	db = next(db_gen)
	try:
		engine = db.get_bind()
		set_clause = ", ".join(f'"{name}" = :{name}' for name in update_data.keys())
		where_clause = " AND ".join(f'"{name}" = :pk_{name}' for name in pk_values.keys())
		params = {**update_data, **{f"pk_{k}": v for k, v in pk_values.items()}}
		with engine.begin() as conn:
			conn.execute(
				text(f'UPDATE "{table_name}" SET {set_clause} WHERE {where_clause}'),
				params,
			)
		print(f"updated: {table_name}")
	finally:
		db_gen.close()
	return 0


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
		table_name = input("update table name: ").strip()
		if table_name not in tables:
			print(f"table not found: {table_name}")
			return 1
		inspector = inspect(engine)
		columns = inspector.get_columns(table_name)
		if not columns:
			print(f"no columns found: {table_name}")
			return 1
		pk_columns = inspector.get_pk_constraint(table_name).get("constrained_columns", [])
		if not pk_columns:
			print(f"no primary key found: {table_name}")
			return 1
		pk_values = _prompt_pk_values(columns, pk_columns)
		if not pk_values:
			return 1
		row = _fetch_record(engine, table_name, pk_values)
		if row is None:
			print("record not found")
			return 1
		update_data = _prompt_update_data(columns, pk_columns, row)
		if not update_data:
			print("no update data")
			return 1
	finally:
		db_gen.close()

	updateRecord(table_name, pk_values, update_data)
	lsRecord(table_name)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
