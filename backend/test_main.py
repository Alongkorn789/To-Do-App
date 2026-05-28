import sys
from unittest.mock import MagicMock, patch

# 1. Setup MongoDB Mock before importing main app
mock_db = MagicMock()
mock_client = MagicMock()
mock_client.taskmanager = mock_db

# Configure default values to prevent startup db seeding during client instantiation
mock_db.categories.count_documents.return_value = 1
mock_db.tasks.count_documents.return_value = 1

# Mock pymongo package in sys.modules
sys.modules['pymongo'] = MagicMock()
import pymongo
pymongo.MongoClient = MagicMock(return_value=mock_client)

# Also mock bson.ObjectId if needed, but we can use real ObjectId for validation
from bson import ObjectId

# 2. Now import FastAPI app and TestClient
from main import app
from fastapi.testclient import TestClient
import pytest

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_db_mocks():
    """Reset mock history and keep default count configurations before each test."""
    mock_db.reset_mock()
    mock_db.categories.count_documents.return_value = 1
    mock_db.tasks.count_documents.return_value = 1

# ==========================================================================
# Task CRUD Unit Tests
# ==========================================================================

def test_get_tasks():
    # Mock data to be returned by tasks collection find()
    mock_tasks = [
        {
            "_id": ObjectId("60d5ec4b1a454d4f4c8b4567"),
            "title": "ออกแบบฐานข้อมูล MongoDB",
            "description": "กำหนดโครงสร้าง Collection และ Schema สำหรับจัดเก็บข้อมูลงาน",
            "dueDate": "2026-05-29",
            "categoryId": "cat-work",
            "priority": "high",
            "completed": False,
            "createdAt": "2026-05-28T12:00:00"
        },
        {
            "_id": ObjectId("60d5ec4b1a454d4f4c8b4569"),
            "title": "ออกกำลังกายตอนเย็น",
            "description": "วิ่งที่สวนลุมพินี 5 กิโลเมตร",
            "dueDate": "2026-05-28",
            "categoryId": "cat-health",
            "priority": "low",
            "completed": True,
            "createdAt": "2026-05-27T17:30:00",
            "completedAt": "2026-05-27T18:30:00"
        }
    ]
    mock_db.tasks.find.return_value = mock_tasks

    response = client.get("/tasks")
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    
    # Verify mapping from _id to id
    assert data[0]["id"] == "60d5ec4b1a454d4f4c8b4567"
    assert data[0]["title"] == "ออกแบบฐานข้อมูล MongoDB"
    assert data[0]["completed"] is False
    
    assert data[1]["id"] == "60d5ec4b1a454d4f4c8b4569"
    assert data[1]["completed"] is True
    
    mock_db.tasks.find.assert_called_once()


def test_create_task():
    # Payload sent from client
    payload = {
        "title": "เขียนสเปกโปรเจกต์ใหม่",
        "description": "เตรียมรายละเอียดฟังก์ชันการทำงานหลัก",
        "dueDate": "2026-05-30",
        "categoryId": "cat-work",
        "priority": "medium"
    }

    # Mock MongoDB insert response
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId("60d5ec4b1a454d4f4c8b456a")
    mock_db.tasks.insert_one.return_value = mock_insert_result

    # Mock MongoDB find_one response after insertion
    mock_db.tasks.find_one.return_value = {
        "_id": ObjectId("60d5ec4b1a454d4f4c8b456a"),
        "title": payload["title"],
        "description": payload["description"],
        "dueDate": payload["dueDate"],
        "categoryId": payload["categoryId"],
        "priority": payload["priority"],
        "completed": False,
        "createdAt": "2026-05-28T15:10:00"
    }

    response = client.post("/tasks", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["id"] == "60d5ec4b1a454d4f4c8b456a"
    assert data["title"] == payload["title"]
    assert data["completed"] is False
    
    mock_db.tasks.insert_one.assert_called_once()
    mock_db.tasks.find_one.assert_called_once_with({"_id": ObjectId("60d5ec4b1a454d4f4c8b456a")})


def test_update_task():
    task_id = "60d5ec4b1a454d4f4c8b4567"
    payload = {
        "title": "ออกแบบฐานข้อมูล MongoDB (อัปเดต)",
        "completed": True,
        "completedAt": "2026-05-28T15:15:00"
    }

    # Mock update response
    mock_db.tasks.update_one.return_value = MagicMock()
    
    # Mock find_one response representing updated document
    mock_db.tasks.find_one.return_value = {
        "_id": ObjectId(task_id),
        "title": payload["title"],
        "description": "กำหนดโครงสร้าง Collection และ Schema สำหรับจัดเก็บข้อมูลงาน",
        "dueDate": "2026-05-29",
        "categoryId": "cat-work",
        "priority": "high",
        "completed": payload["completed"],
        "createdAt": "2026-05-28T12:00:00",
        "completedAt": payload["completedAt"]
    }

    response = client.put(f"/tasks/{task_id}", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["id"] == task_id
    assert data["title"] == payload["title"]
    assert data["completed"] is True
    
    mock_db.tasks.update_one.assert_called_once_with(
        {"_id": ObjectId(task_id)},
        {"$set": payload}
    )
    mock_db.tasks.find_one.assert_called_once_with({"_id": ObjectId(task_id)})


def test_delete_task():
    task_id = "60d5ec4b1a454d4f4c8b4567"
    
    # Mock delete response
    mock_db.tasks.delete_one.return_value = MagicMock()

    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert task_id in data["message"]
    
    mock_db.tasks.delete_one.assert_called_once_with({"_id": ObjectId(task_id)})
