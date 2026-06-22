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
from main import app, get_current_user
from fastapi.testclient import TestClient
import pytest

client = TestClient(app)

# Override auth dependency for testing CRUD & Smart Add
app.dependency_overrides[get_current_user] = lambda: "mock_user_id"

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
    mock_db.tasks.find_one.assert_called_once_with({"_id": ObjectId("60d5ec4b1a454d4f4c8b456a"), "userId": "mock_user_id"})


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
        {"_id": ObjectId(task_id), "userId": "mock_user_id"},
        {"$set": payload}
    )
    mock_db.tasks.find_one.assert_called_once_with({"_id": ObjectId(task_id), "userId": "mock_user_id"})


def test_delete_task():
    task_id = "60d5ec4b1a454d4f4c8b4567"
    
    # Mock delete response
    mock_db.tasks.delete_one.return_value = MagicMock()

    response = client.delete(f"/tasks/{task_id}")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "success"
    assert task_id in data["message"]
    
    mock_db.tasks.delete_one.assert_called_once_with({"_id": ObjectId(task_id), "userId": "mock_user_id"})


# ==========================================================================
# AI Smart Add Unit Tests
# ==========================================================================

@patch('main.client_ai.chat.completions.create')
def test_smart_add_success(mock_create):
    # Mock categories list from DB
    mock_categories = [
        {"_id": "cat-work", "name": "งาน (Work)", "icon": "work", "color": "violet"},
        {"_id": "cat-personal", "name": "ส่วนตัว (Personal)", "icon": "person", "color": "blue"}
    ]
    mock_db.categories.find.return_value = mock_categories

    # Mock the response from OpenAI client (standard JSON output)
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"title": "ส่งรายงานภาษี", "description": "รวบรวมไฟล์ส่งฝ่ายบัญชีด่วน", "categoryId": "cat-work", "dueDate": "2026-05-29", "priority": "high"}'
    mock_response.choices = [mock_choice]
    mock_create.return_value = mock_response

    payload = {"text": "ส่งรายงานภาษีด่วน พรุ่งนี้"}
    response = client.post("/api/smart-add", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "ส่งรายงานภาษี"
    assert data["description"] == "รวบรวมไฟล์ส่งฝ่ายบัญชีด่วน"
    assert data["categoryId"] == "cat-work"
    assert data["dueDate"] == "2026-05-29"
    assert data["priority"] == "high"

    mock_create.assert_called_once()
    mock_db.categories.find.assert_called_once()


@patch('main.client_ai.chat.completions.create')
def test_smart_add_success_markdown_wrapped(mock_create):
    mock_db.categories.find.return_value = []

    # Mock the response from OpenAI client (wrapped in markdown code block)
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '```json\n{"title": "ซื้อของเข้าบ้าน", "description": "ซื้อส้มและนม", "categoryId": "", "dueDate": "", "priority": "low"}\n```'
    mock_response.choices = [mock_choice]
    mock_create.return_value = mock_response

    payload = {"text": "ซื้อของเข้าบ้าน พรุ่งนี้"}
    response = client.post("/api/smart-add", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "ซื้อของเข้าบ้าน"
    assert data["description"] == "ซื้อส้มและนม"
    assert data["categoryId"] == ""
    assert data["dueDate"] == ""
    assert data["priority"] == "low"


@patch('main.client_ai.chat.completions.create')
def test_smart_add_fallback(mock_create):
    mock_db.categories.find.return_value = []

    # Case 1: Exception raised by client_ai (e.g. Connection Error, API error)
    mock_create.side_effect = Exception("API connection timed out")

    payload = {"text": "ส่งรายงานภาษีด่วน พรุ่งนี้"}
    response = client.post("/api/smart-add", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "ส่งรายงานภาษีด่วน พรุ่งนี้"
    assert "วิเคราะห์ล้มเหลว" in data["description"]
    assert data["categoryId"] == ""
    assert data["dueDate"] == ""
    assert data["priority"] == "low"

    # Case 2: Invalid JSON string returned
    mock_create.side_effect = None
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "นี่ไม่ใช่ JSON แต่เป็นข้อความธรรมดา"
    mock_response.choices = [mock_choice]
    mock_create.return_value = mock_response

    response = client.post("/api/smart-add", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "ส่งรายงานภาษีด่วน พรุ่งนี้"
    assert "วิเคราะห์ล้มเหลว" in data["description"]


# ==========================================================================
# Authentication API Unit Tests
# ==========================================================================

def test_register_success():
    payload = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123"
    }
    # Mock user check returns None
    mock_db.users.find_one.return_value = None
    
    # Mock insert user
    mock_insert_result = MagicMock()
    mock_insert_result.inserted_id = ObjectId("60d5ec4b1a454d4f4c8b456b")
    mock_db.users.insert_one.return_value = mock_insert_result
    
    # Mock seeding of default categories & tasks
    mock_db.categories.insert_one.return_value = MagicMock(inserted_id="seeded-cat")
    mock_db.tasks.insert_many.return_value = MagicMock()

    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["userId"] == "60d5ec4b1a454d4f4c8b456b"
    
    mock_db.users.find_one.assert_called_once()
    mock_db.users.insert_one.assert_called_once()
    mock_db.categories.insert_one.assert_called()
    mock_db.tasks.insert_many.assert_called_once()


def test_register_missing_fields():
    payload = {
        "username": "newuser"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


def test_register_existing_user():
    payload = {
        "username": "existinguser",
        "email": "existinguser@example.com",
        "password": "password123"
    }
    mock_db.users.find_one.return_value = {"username": "existinguser"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400


import bcrypt

def test_login_success():
    payload = {
        "username": "testuser",
        "password": "password123"
    }
    hashed = bcrypt.hashpw(payload["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    mock_user = {
        "_id": ObjectId("60d5ec4b1a454d4f4c8b456c"),
        "username": "testuser",
        "email": "testuser@example.com",
        "password_hash": hashed
    }
    mock_db.users.find_one.return_value = mock_user

    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "access_token" in response.cookies


def test_login_invalid_password():
    payload = {
        "username": "testuser",
        "password": "wrongpassword"
    }
    hashed = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    mock_user = {
        "_id": ObjectId("60d5ec4b1a454d4f4c8b456c"),
        "username": "testuser",
        "email": "testuser@example.com",
        "password_hash": hashed
    }
    mock_db.users.find_one.return_value = mock_user

    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 401


def test_logout():
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_get_me_authenticated():
    mock_user = {
        "_id": ObjectId("60d5ec4b1a454d4f4c8b456c"),
        "username": "testuser",
        "email": "testuser@example.com"
    }
    mock_db.users.find_one.return_value = mock_user
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"
    mock_db.users.find_one.assert_called_once_with({"_id": "mock_user_id"})


def test_get_me_not_found():
    mock_db.users.find_one.return_value = None
    response = client.get("/api/auth/me")
    assert response.status_code == 404


