import os
import json
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pymongo import MongoClient
# pyrefly: ignore [missing-import]
from bson import ObjectId
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from openai import OpenAI
import bcrypt
import jwt
import re

# Load Environment Variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_jwt_key_123456")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "True").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "none")

# Initialize OpenAI client with HuggingFace Endpoint
client_ai = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=os.getenv("HF_TOKEN", "dummy_key")
)

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

# Cryptographic and Auth Helpers
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=1440))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

def get_current_user(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid session token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session token")

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

def seed_user_data(user_id: str):
    # Seed categories first
    category_id_map = {}
    user_categories = []
    for cat in DEFAULT_CATEGORIES:
        new_cat = {
            "userId": user_id,
            "name": cat["name"],
            "icon": cat["icon"],
            "color": cat["color"]
        }
        res = db.categories.insert_one(new_cat)
        category_id_map[cat["_id"]] = str(res.inserted_id)

    # Seed tasks
    default_tasks = [
        {
            "userId": user_id,
            "title": "ออกแบบ UI แดชบอร์ดสำหรับโปรเจกต์ TaskFlow",
            "description": "พัฒนาหน้าตาแดชบอร์ดตามโครงร่างด้วยสไตล์ Glassmorphism และตั้งค่าระบบสี Dark/Light mode ให้ดูทันสมัยพรีเมียม",
            "dueDate": get_relative_date_string(1),
            "categoryId": category_id_map.get("cat-work", ""),
            "priority": "high",
            "completed": False,
            "createdAt": (datetime.now() - timedelta(hours=2)).isoformat()
        },
        {
            "userId": user_id,
            "title": "ซื้อผักผลไม้สดและนมกล่องที่ซูเปอร์มาร์เก็ต",
            "description": "แวะซื้อกล้วยหอม อะโวคาโด นมจืด และไข่ไก่สำหรับตุนไว้ช่วงสัปดาห์นี้",
            "dueDate": get_relative_date_string(0),
            "categoryId": category_id_map.get("cat-shopping", ""),
            "priority": "medium",
            "completed": False,
            "createdAt": (datetime.now() - timedelta(hours=5)).isoformat()
        },
        {
            "userId": user_id,
            "title": "วิ่งออกกำลังกายจ็อกกิ้งรอบสวนสาธารณะ 5 กม.",
            "description": "คาร์ดิโอช่วงเย็นเพื่อรักษาสุขภาพ ยืดกล้ามเนื้อก่อนและหลังวิ่งให้ดี",
            "dueDate": get_relative_date_string(0),
            "categoryId": category_id_map.get("cat-health", ""),
            "priority": "low",
            "completed": True,
            "createdAt": (datetime.now() - timedelta(days=1)).isoformat()
        },
        {
            "userId": user_id,
            "title": "เคลียร์กล่องข้อความและตอบกลับอีเมลลูกค้า",
            "description": "ตอบกลับข้อสอบถามเกี่ยวกับบริการใหม่และอัปเดตไฟล์สไลด์นำเสนอส่งให้ฝ่ายขาย",
            "dueDate": get_relative_date_string(3),
            "categoryId": category_id_map.get("cat-work", ""),
            "priority": "medium",
            "completed": False,
            "createdAt": (datetime.now() - timedelta(days=2)).isoformat()
        }
    ]
    db.tasks.insert_many(default_tasks)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Minimal startup seeding checks if necessary (or leave empty as we do per-user seeding)
    yield

app = FastAPI(
    title="TaskFlow Backend API",
    description="Backend API for TaskFlow Task Manager / To-Do App",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

# Health Check Endpoint (ไม่ query DB — ตอบกลับทันที)
# ใช้สำหรับ Render Health Check เพื่อ keep service ไม่ให้ Sleep
# และใช้ Frontend ping เพื่อ wake up server ก่อนเรียก auth/me
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# ==========================================================================
# AUTHENTICATION API ENDPOINTS
# ==========================================================================

@app.post("/api/auth/register")
def register(payload: dict):
    username = payload.get("username", "").strip()
    email = payload.get("email", "").strip()
    password = payload.get("password", "")

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Username, email, and password are required")

    # Check existing user
    if db.users.find_one({"$or": [{"username": username}, {"email": email}]}):
        raise HTTPException(status_code=400, detail="Username or email already exists")

    # Create new user
    hashed = hash_password(password)
    user_doc = {
        "username": username,
        "email": email,
        "password_hash": hashed,
        "createdAt": datetime.now().isoformat()
    }
    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Seed default tasks and categories for the new user
    seed_user_data(user_id)

    return {
        "status": "success",
        "message": "User registered successfully",
        "userId": user_id
    }

@app.post("/api/auth/login")
def login(payload: dict, response: Response):
    username = payload.get("username", "").strip()
    password = payload.get("password", "")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    # Find user
    user = db.users.find_one({"username": username})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_id = str(user["_id"])
    token = create_access_token(data={"sub": user_id})

    # Set JWT in HTTP-Only cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,

        #samesite="none",

        path="/",  # <--- เติมบรรทัดนี้ลงไปครับ (สำคัญมาก!)

        max_age=1440 * 60, # 24 hours
        expires=1440 * 60
    )

    return {
        "status": "success",
        "message": "Logged in successfully",
        "user": {
            "id": user_id,
            "username": user["username"],
            "email": user["email"]
        }
    }

@app.post("/api/auth/logout")
def logout(response: Response):
    # Clear the cookie
    response.delete_cookie(
        key="access_token",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,

        #samesite="none",
        
        path="/"  # <--- เติมบรรทัดนี้ลงไปครับ!
    )
    return {
        "status": "success",
        "message": "Logged out successfully"
    }

@app.get("/api/auth/me")
def get_me(user_id: str = Depends(get_current_user)):
    user = db.users.find_one({"_id": parse_id(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"]
    }

# ==========================================================================
# TASKS API ENDPOINTS
# ==========================================================================

@app.get("/tasks")
def get_tasks(user_id: str = Depends(get_current_user)):
    tasks = db.tasks.find({"userId": user_id})
    return [task_helper(t) for t in tasks]

@app.post("/tasks")
def create_task(task: dict, user_id: str = Depends(get_current_user)):
    if "id" in task:
        task.pop("id")
    # Set created time if not provided
    if not task.get("createdAt"):
        task["createdAt"] = datetime.now().isoformat()
    task["completed"] = task.get("completed", False)
    task["userId"] = user_id
    
    result = db.tasks.insert_one(task)
    inserted_task = db.tasks.find_one({"_id": result.inserted_id, "userId": user_id})
    return task_helper(inserted_task)

@app.put("/tasks/{id}")
def update_task(id: str, task_data: dict, user_id: str = Depends(get_current_user)):
    if "id" in task_data:
        task_data.pop("id")
    
    res = db.tasks.update_one({"_id": parse_id(id), "userId": user_id}, {"$set": task_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
        
    updated = db.tasks.find_one({"_id": parse_id(id), "userId": user_id})
    return task_helper(updated)

@app.delete("/tasks/{id}")
def delete_task(id: str, user_id: str = Depends(get_current_user)):
    res = db.tasks.delete_one({"_id": parse_id(id), "userId": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized")
    return {"status": "success", "message": f"Task {id} deleted successfully"}

# ==========================================================================
# CATEGORIES API ENDPOINTS
# ==========================================================================

@app.get("/categories")
def get_categories(user_id: str = Depends(get_current_user)):
    categories = db.categories.find({"userId": user_id})
    return [category_helper(c) for c in categories]

@app.post("/categories")
def create_category(cat: dict, user_id: str = Depends(get_current_user)):
    if "id" in cat:
        cat.pop("id")
    cat["userId"] = user_id
    result = db.categories.insert_one(cat)
    inserted = db.categories.find_one({"_id": result.inserted_id, "userId": user_id})
    return category_helper(inserted)

@app.delete("/categories/{id}")
def delete_category(id: str, user_id: str = Depends(get_current_user)):
    res = db.categories.delete_one({"_id": parse_id(id), "userId": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found or unauthorized")
    # Clean up associated tasks to have no category
    db.tasks.update_many({"categoryId": id, "userId": user_id}, {"$set": {"categoryId": ""}})
    return {"status": "success", "message": f"Category {id} deleted successfully"}

# ==========================================================================
# THEME CONFIG ENDPOINTS
# ==========================================================================

@app.get("/theme")
def get_theme(user_id: str = Depends(get_current_user)):
    theme_doc = db.settings.find_one({"key": "theme", "userId": user_id})
    if theme_doc:
        return {"theme": theme_doc["value"]}
    return {"theme": "dark"}

@app.put("/theme")
def update_theme(data: dict, user_id: str = Depends(get_current_user)):
    theme = data.get("theme", "dark")
    db.settings.update_one(
        {"key": "theme", "userId": user_id},
        {"$set": {"value": theme}},
        upsert=True
    )
    return {"status": "success", "theme": theme}

# ==========================================================================
# AI SMART ADD ENDPOINT
# ==========================================================================

@app.post("/api/smart-add")
def smart_add(payload: dict, user_id: str = Depends(get_current_user)):
    user_text = payload.get("text", "").strip()
    
    # Fallback response template
    fallback_response = {
        "title": user_text,
        "description": "วิเคราะห์ล้มเหลว: ไม่สามารถประมวลผลด้วย AI ได้",
        "categoryId": "",
        "dueDate": "",
        "priority": "low"
    }
    
    if not user_text:
        return {
            "title": "",
            "description": "",
            "categoryId": "",
            "dueDate": "",
            "priority": "low"
        }

    try:
        # Retrieve user-specific categories to help model matching
        categories = list(db.categories.find({"userId": user_id}))
        category_list_str = "\n".join([f"- ID: {str(c['_id'])}, Name: {c['name']}" for c in categories])
        example_cat_id = str(categories[0]['_id']) if categories else ""

        today = datetime.now()
        calendar_cheat_sheet = ""
        for i in range(8):
            future_date = today + timedelta(days=i)
            day_name = future_date.strftime('%A') # วันในสัปดาห์ (เช่น Monday)
            date_str = future_date.strftime('%Y-%m-%d')
            calendar_cheat_sheet += f"- {day_name} = {date_str}\n"

        system_prompt = f"""You are a productivity assistant for a Task Manager app.
Analyze the user's unstructured input and extract the task details.
You MUST respond with a single valid JSON object.

CRITICAL RULES:
1. Do NOT wrap the JSON in Markdown code blocks (no ```json).
2. Escape any newlines in the "description" field using \\n. Do NOT output literal newlines inside string values.

Available categories in the system:
{category_list_str}

CALENDAR REFERENCE (Today is {today.strftime('%A')}):
{calendar_cheat_sheet}

The JSON object must have exactly these keys:
1. "title" (string): The main task name. Make it short, concise, and actionable. DO NOT include temporal words like 'วันอาทิตย์นี้', 'พรุ่งนี้', or 'ว่างๆ' in the title. (e.g. use 'ตั้งค่าคอมพิวเตอร์เครื่องใหม่' instead of 'วันอาทิตย์นี้ว่างๆ ช่วยลง...').
2. "description" (string): All additional details and context. You MUST fully preserve any URLs, links, and specific instructions from the input. DO NOT over-summarize or drop links.
3. "categoryId" (string): The matching Category ID from the list above. If no category fits, use "".
4. "dueDate" (string): The due date in YYYY-MM-DD format. Look at the CALENDAR REFERENCE above to map Thai words (e.g., 'พรุ่งนี้' = tomorrow, 'วันอาทิตย์นี้' = Sunday) to the EXACT date. If no date is mentioned, use "".
5. "priority" (string): "low", "medium", or "high".

Example output:
{{"title": "พรีเซ้นทีม Academy", "description": "ให้น้องๆ แต่ละทีมทำสไลด์และพรีเซ้นเอง\\nเวลาพรีเซ้น 1-2 นาทีต่อทีม", "categoryId": "{example_cat_id}", "dueDate": "2026-06-23", "priority": "medium"}}
"""
        
        # Call HuggingFace OpenAI API Router
        response = client_ai.chat.completions.create(
            model="meta-llama/Meta-Llama-3-8B-Instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            temperature=0.1,
            #max_tokens=256
            max_tokens=2048
        )

        raw_content = response.choices[0].message.content.strip()

        # 🟢 Clean-up ขั้นสุดยอด: ดึงเฉพาะข้อมูลที่อยู่ระหว่าง { และ } เท่านั้น
        # ข้ามข้อความพูดคุยที่ AI อาจจะพิมพ์แถมมา
        match = re.search(r'\{.*\}', raw_content, re.DOTALL)
        if match:
            cleaned_content = match.group(0)
        else:
            cleaned_content = raw_content

        # 🟢 แปลง JSON โดยเปิด strict=False เพื่อยอมให้มี URL, วงเล็บ, หรือการเว้นบรรทัดซ่อนอยู่ได้
        parsed_json = json.loads(cleaned_content, strict=False)


        
        # Ensure essential keys are present, matching fallback otherwise
        return {
            "title": parsed_json.get("title", user_text) or user_text,
            "description": parsed_json.get("description", ""),
            "categoryId": parsed_json.get("categoryId", ""),
            "dueDate": parsed_json.get("dueDate", ""),
            "priority": parsed_json.get("priority", "low")
        }
        
    except Exception as e:
        print("====== AI ERROR DEBUG ======")
        print(f"Error Message: {e}")
        try:
            print(f"Raw Output from AI: {raw_content}")
        except:
            pass
        print("============================")
        
        return fallback_response
