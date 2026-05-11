from functools import lru_cache
import os
from urllib.parse import urlparse

from pymongo import MongoClient
from pymongo.database import Database


MAX_DB_NAME_BYTES = 38
DEFAULT_DB_NAME = 'hospital_appointments'


def _database_name_from_uri(mongodb_uri: str | None) -> str | None:
    if not mongodb_uri:
        return None
    parsed_uri = urlparse(mongodb_uri)
    db_name = parsed_uri.path.lstrip('/').strip()
    return db_name or None


def get_database_name() -> str:
    explicit_db_name = os.getenv('MONGODB_DB_NAME', '').strip()
    if explicit_db_name:
        db_name = explicit_db_name
    else:
        db_name_from_uri = _database_name_from_uri(os.getenv('MONGODB_URI'))
        if db_name_from_uri and len(db_name_from_uri.encode('utf-8')) <= MAX_DB_NAME_BYTES:
            db_name = db_name_from_uri
        else:
            db_name = DEFAULT_DB_NAME

    if len(db_name.encode('utf-8')) > MAX_DB_NAME_BYTES:
        raise RuntimeError(
            f'MongoDB database name "{db_name}" is too long. Maximum length is {MAX_DB_NAME_BYTES} bytes.'
        )

    return db_name


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        raise RuntimeError('MONGODB_URI is not configured.')
    return MongoClient(mongodb_uri, serverSelectionTimeoutMS=3000)


def get_database() -> Database:
    client = get_mongo_client()
    return client.get_database(get_database_name())
