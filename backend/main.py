from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="TaskFlow Backend API",
    description="Backend API for TaskFlow Task Manager / To-Do App",
    version="1.0.0"
)

# Configure CORS Middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Test Endpoint
@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "TaskFlow Backend API is running successfully!"
    }
