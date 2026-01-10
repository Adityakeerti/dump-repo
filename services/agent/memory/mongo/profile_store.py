from typing import Dict , List
from memory.mongo.client import MongoClient

class ProfileStore:
    def __init__(self, client: MongoDBClient):
        self.collection = client.collection("user_profiles")

    def get_user_profile(self, user_id: str) -> Dict:
        profile = self.collection.find_one({"user_id": user_id})
        return profile or {"user_id": user_id}

    def update_user_profile(self, user_id: str, data: Dict) -> None:
        self.collection.update_one(
            {"user_id": user_id},
            {"$set": data},
            upsert=True,
        )