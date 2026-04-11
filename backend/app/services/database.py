import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

print("MONGO URI:", settings.MONGO_URI)
logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


async def connect_db() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _client[settings.MONGO_DB_NAME]
    await _client.admin.command("ping")
    logger.info(f"[DB] Connected → {settings.MONGO_URI}/{settings.MONGO_DB_NAME}")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("[DB] Connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_db() at startup.")
    return _db


def get_users_collection():
    return get_db()["users"]


def get_documents_collection():
    return get_db()["documents"]


def get_chats_collection():
    return get_db()["chats"]