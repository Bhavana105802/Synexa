import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional

from app.services.database import get_chats_collection

logger = logging.getLogger(__name__)
MAX_HISTORY = 10


async def create_chat(
    user_id: str,
    document_id: str,
    title: str = "New Chat",
) -> str:
    chat_id = "chat_" + uuid.uuid4().hex[:12]
    now = datetime.now(timezone.utc)

    await get_chats_collection().insert_one({
        "_id": chat_id,
        "user_id": user_id,
        "document_id": document_id,
        "title": title,
        "messages": [],
        "created_at": now,
        "updated_at": now,
    })

    logger.info(
        f"[Memory] Created chat '{chat_id}' "
        f"user='{user_id}' doc='{document_id}'"
    )
    return chat_id


async def get_chat(chat_id: str) -> Optional[Dict]:
    try:
        return await get_chats_collection().find_one({"_id": chat_id})
    except Exception as e:
        logger.warning(f"[Memory] get_chat failed: {e}")
        return None


async def get_chat_history(chat_id: str) -> List[Dict[str, str]]:
    try:
        doc = await get_chats_collection().find_one(
            {"_id": chat_id},
            {"messages": 1}
        )
        if not doc or not doc.get("messages"):
            return []
        msgs = doc["messages"][-MAX_HISTORY:]
        return [{"role": m["role"], "content": m["content"]} for m in msgs]
    except Exception as e:
        logger.warning(f"[Memory] get_chat_history failed: {e}")
        return []


async def get_user_chats(user_id: str) -> List[Dict]:
    try:
        cursor = get_chats_collection().find(
            {"user_id": user_id},
            {"messages": 0}
        ).sort("updated_at", -1)
        return await cursor.to_list(length=200)
    except Exception as e:
        logger.warning(f"[Memory] get_user_chats failed: {e}")
        return []


async def save_message(
    chat_id: str,
    role: str,
    content: str,
) -> None:
    try:
        col = get_chats_collection()
        now = datetime.now(timezone.utc)
        msg = {"role": role, "content": content, "ts": now}

        update: Dict = {
            "$push": {"messages": msg},
            "$set": {"updated_at": now},
        }

        if role == "user":
            chat = await col.find_one({"_id": chat_id}, {"messages": 1, "title": 1})
            if chat and not any(
                m["role"] == "user" for m in (chat.get("messages") or [])
            ):
                update["$set"]["title"] = content[:60]

        await col.update_one({"_id": chat_id}, update)

    except Exception as e:
        logger.warning(f"[Memory] save_message failed: {e}")


async def clear_chat_messages(chat_id: str) -> None:
    try:
        await get_chats_collection().update_one(
            {"_id": chat_id},
            {"$set": {
                "messages": [],
                "updated_at": datetime.now(timezone.utc),
            }},
        )
    except Exception as e:
        logger.warning(f"[Memory] clear_chat_messages failed: {e}")


async def delete_chat(chat_id: str, user_id: str) -> bool:
    try:
        result = await get_chats_collection().delete_one(
            {"_id": chat_id, "user_id": user_id}
        )
        return result.deleted_count > 0
    except Exception as e:
        logger.warning(f"[Memory] delete_chat failed: {e}")
        return False


def format_history_for_prompt(messages: List[Dict[str, str]]) -> str:
    if not messages:
        return ""
    lines = []
    for m in messages:
        label = "User" if m["role"] == "user" else "Assistant"
        lines.append(f"{label}: {m['content']}")
    return "\n".join(lines)