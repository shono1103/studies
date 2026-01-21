#!/usr/bin/env python3
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker


load_dotenv()
dsn = os.getenv("DATABASE_URL")
if not dsn:
	dsn = URL.create(
		drivername="postgresql+psycopg2",
		host=os.getenv("POSTGRES_HOST", "localhost"),
		port=int(os.getenv("POSTGRES_PORT", "5432")),
		username=os.getenv("POSTGRES_USER", "postgres"),
		password=os.getenv("POSTGRES_PASSWORD", ""),
		database=os.getenv("POSTGRES_DB", "postgres"),
	)

engine = create_engine(dsn)
SessionLocal = sessionmaker(bind=engine)


