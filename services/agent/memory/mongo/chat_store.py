from typing import List , Dict
from memory.mongo.client import MongoDBClient

class ChatStore:
    def __init__ (self , client : MongoDBClient):
        self.collection = client.collection("chat_messages")

    def store_messages(
        self ,
        user_id : str ,
        role : str ,
        content : str ,
        metadata : Dict ,
    ) -> None:
        self.collection.insert_one({
            "user_id": user_id,
            "role": role,
            "content": content,
            "metadata": metadata,
        })
    def get_recent_messages(
        self ,
        user_id : str ,
        limit : int = 10
    ) -> List[Dict]:
        cursor = (
            self.collection.find({"user_id": user_id})
            .sort("timestamp", -1)
            .limit(limit)
        )
        return list(reversed(list(cursor)))