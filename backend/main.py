import os
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pymongo import MongoClient
# pyrefly: ignore [missing-import]
from bson import ObjectId
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client.taskmanager

# Default data for database seeding
DEFAULT_CATEGORIES = [
    { "_id": "cat-work", "name": "งาน (Work)", "icon": "work", "color": "violet" },
    { "_id": "cat-personal", "name": "ส่วนตัว (Personal)", "icon": "person", "color": "blue" },
    { "_id": "cat-shopping", "name": "ช้อปปิ้ง (Shopping)", "icon": "shopping_cart", "color": "emerald" },
    { "_id": "cat-health", "name": "สุขภาพ (Health)", "icon": "favorite", "color": "rose" }
]

def get_relative_date_string(offset_days):
    d = datetime.now() + timedelta(days=offset_days)
    return d.strftime("%Y-%m-%d")

# MongoDB helper functions
def task_helper(task) -> dict:
    return {
        "id": str(task["_id"]),
        "title": task.get("title", ""),
        "description": task.get("description", ""),
        "dueDate": task.get("dueDate", ""),
        "categoryId": task.get("categoryId", ""),
        "priority": task.get("priority", "low"),
        "completed": task.get("completed", False),
        "createdAt": task.get("createdAt"),
        "completedAt": task.get("completedAt")
    }

def category_helper(cat) -> dict:
    return {
        "id": str(cat["_id"]),
        "name": cat.get("name", ""),
        "icon": cat.get("icon", "work"),
        "color": cat.get("color", "violet")
    }

def parse_id(id_str: str):
    try:
        return ObjectId(id_str)
    except Exception:
        return id_str

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed default categories if empty
    if db.categories.count_documents({}) == 0:
        db.categories.insert_many(DEFAULT_CATEGORIES)
        print("Seeded default categories in MongoDB.")
    
    # Seed default tasks if empty
    if db.tasks.count_documents({}) == 0:
        default_tasks = [
            {
                "title": "ออกแบบ UI แดชบอร์ดสำหรับโปรเจกต์ TaskFlow",
                "description": "พัฒนาหน้าตาแดชบอร์ดตามโครงร่างด้วยสไตล์ Glassmorphism และตั้งค่าระบบสี Dark/Light mode ให้ดูทันสมัยพรีเมียม",
                "dueDate": get_relative_date_string(1),
                "categoryId": "cat-work",
                "priority": "high",
                "completed": False,
                "createdAt": (datetime.now() - timedelta(hours=2)).isoformat()
            },
            {
                "title": "ซื้อผักผลไม้สดและนมกล่องที่ซูเปอร์มาร์เก็ต",
                "description": "แวะซื้อกล้วยหอม อะโวคาโด นมจืด และไข่ไก่สำหรับตุนไว้ช่วงสัปดาห์นี้",
                "dueDate": get_relative_date_string(0),
                "categoryId": "cat-shopping",
                "priority": "medium",
                "completed": False,
                "createdAt": (datetime.now() - timedelta(hours=5)).isoformat()
            },
            {
                "title": "วิ่งออกกำลังกายจ็อกกิ้งรอบสวนสาธารณะ 5 กม.",
                "description": "คาร์ดิโอช่วงเย็นเพื่อรักษาสุขภาพ ยืดกล้ามเนื้อก่อนและหลังวิ่งให้ดี",
                "dueDate": get_relative_date_string(0),
                "categoryId": "cat-health",
                "priority": "low",
                "completed": True,
                "createdAt": (datetime.now() - timedelta(days=1)).isoformat()
            },
            {
                "title": "เคลียร์กล่องข้อความและตอบกลับอีเมลลูกค้า",
                "description": "ตอบกลับข้อสอบถามเกี่ยวกับบริการใหม่และอัปเดตไฟล์สไลด์นำเสนอส่งให้ฝ่ายขาย",
                "dueDate": get_relative_date_string(3),
                "categoryId": "cat-work",
                "priority": "medium",
                "completed": False,
                "createdAt": (datetime.now() - timedelta(days=2)).isoformat()
            }
        ]
        db.tasks.insert_many(default_tasks)
        print("Seeded default tasks in MongoDB.")
    yield

app = FastAPI(
    title="TaskFlow Backend API",
    description="Backend API for TaskFlow Task Manager / To-Do App",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Test Endpoint
@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "TaskFlow Backend API is running successfully!"
    }

# TASKS API ENDPOINTS
@app.get("/tasks")
def get_tasks():
    tasks = db.tasks.find()
    return [task_helper(t) for t in tasks]

@app.post("/tasks")
def create_task(task: dict):
    if "id" in task:
        task.pop("id")
    # Set created time if not provided
    if not task.get("createdAt"):
        task["createdAt"] = datetime.now().isoformat()
    task["completed"] = task.get("completed", False)
    
    result = db.tasks.insert_one(task)
    inserted_task = db.tasks.find_one({"_id": result.inserted_id})
    return task_helper(inserted_task)

@app.put("/tasks/{id}")
def update_task(id: str, task_data: dict):
    if "id" in task_data:
        task_data.pop("id")
    
    db.tasks.update_one({"_id": parse_id(id)}, {"$set": task_data})
    updated = db.tasks.find_one({"_id": parse_id(id)})
    if updated:
        return task_helper(updated)
    return {"status": "error", "message": "Task not found"}

@app.delete("/tasks/{id}")
def delete_task(id: str):
    db.tasks.delete_one({"_id": parse_id(id)})
    return {"status": "success", "message": f"Task {id} deleted successfully"}

# CATEGORIES API ENDPOINTS
@app.get("/categories")
def get_categories():
    categories = db.categories.find()
    return [category_helper(c) for c in categories]

@app.post("/categories")
def create_category(cat: dict):
    if "id" in cat:
        cat.pop("id")
    result = db.categories.insert_one(cat)
    inserted = db.categories.find_one({"_id": result.inserted_id})
    return category_helper(inserted)

@app.delete("/categories/{id}")
def delete_category(id: str):
    db.categories.delete_one({"_id": parse_id(id)})
    # Clean up associated tasks to have no category
    db.tasks.update_many({"categoryId": id}, {"$set": {"categoryId": ""}})
    return {"status": "success", "message": f"Category {id} deleted successfully"}

# THEME CONFIG ENDPOINTS
@app.get("/theme")
def get_theme():
    theme_doc = db.settings.find_one({"key": "theme"})
    if theme_doc:
        return {"theme": theme_doc["value"]}
    return {"theme": "dark"}

@app.put("/theme")
def update_theme(data: dict):
    theme = data.get("theme", "dark")
    db.settings.update_one({"key": "theme"}, {"$set": {"value": theme}}, upsert=True)
    return {"status": "success", "theme": theme}
