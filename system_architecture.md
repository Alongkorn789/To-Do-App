# TaskFlow System Architecture & Dependency Graph

This document details the system architecture and dependency graph of TaskFlow, showing the interaction between the frontend components, the backend server, database, and the Hugging Face AI service.

## Architecture Diagram

```mermaid
%%{init: {'theme': 'default', 'themeVariables': { 'fontSize': '18px', 'primaryColor': '#ffffff', 'lineColor': '#333333', 'primaryTextColor': '#000000'}}}%%
graph TD
    %% การจัดกลุ่มฝั่งหน้าบ้าน
    subgraph Frontend ["Frontend (Vite / Vanilla JS)"]
        HTML(index.html)
        CSS(src/css/main.css)
        APP(src/js/app.js)
        STORAGE(src/js/storage.js)
        
        HTML -.->|1. โหลดโครงสร้างและ UI| CSS
        HTML -.->|2. เรียกใช้งาน DOM Logic| APP
        APP -->|3. จัดการข้อมูลและยิง API| STORAGE
    end

    %% การจัดกลุ่มฝั่งหลังบ้าน
    subgraph Backend ["Backend (FastAPI)"]
        MAIN(backend/main.py)
        ENV(backend/.env)
        REQ(backend/requirements.txt)
        
        MAIN -.->|อ่านค่า Secret Keys| ENV
        REQ -.->|Dependencies| MAIN
    end

    %% การจัดกลุ่มบริการภายนอก
    subgraph External_Services ["External Services"]
        DB[(MongoDB)]
        AI[HuggingFace Llama-3]
    end

    %% ความสัมพันธ์ข้ามสถาปัตยกรรม
    STORAGE == "HTTP POST /api/smart-add" ==> MAIN
    STORAGE == "HTTP GET/POST/PUT/DELETE" ==> MAIN
    
    MAIN == "CRUD Operations" ==> DB
    MAIN == "POST /v1/chat/completions" ==> AI
```
