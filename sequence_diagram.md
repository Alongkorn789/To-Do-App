# TaskFlow System Sequence Diagram

This document contains the sequence diagram representing the core data flows of the TaskFlow application, including **Normal Add Task** and **Smart Add (AI)** with fallback error handling.

## Sequence Diagram

```mermaid
%%{init: {'theme': 'default', 'themeVariables': { 'fontSize': '18px', 'primaryColor': '#ffffff', 'lineColor': '#333333', 'primaryTextColor': '#000000', 'noteBkgColor': '#f4f4f4', 'noteTextColor': '#000000', 'actorBorder': '#333333', 'actorBkg': '#ffffff', 'actorTextColor': '#000000', 'labelBoxBorderColor': '#333333', 'labelBoxBkgColor': '#f4f4f4', 'labelTextActiveColor': '#000000' }}}%%
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend (Vite CSS/JS)
    participant Backend as Backend (FastAPI)
    participant Database as Database (MongoDB)
    participant AI_Service as AI_Service (HuggingFace Llama-3)

    %% Flow 1: Normal Add Task
    rect rgb(240, 244, 248)
        Note over User, Database: 1. Normal Add Task Flow
        User->>Frontend: Click "เพิ่มงานใหม่", fill form & submit
        Frontend->>Backend: POST /tasks (JSON payload)
        Backend->>Database: insert_one(task)
        Database-->>Backend: Inserted document / ID
        Backend-->>Frontend: HTTP 200 (Saved task helper object)
        Frontend->>Frontend: Refresh Task List UI & show Success Toast
    end

    %% Flow 2: Smart Add AI
    rect rgb(243, 239, 255)
        Note over User, AI_Service: 2. Smart Add AI Flow (with Fallback)
        User->>Frontend: Click "Smart Add (AI)", input text & submit
        Frontend->>Frontend: Show Loading Spinner & Disable Inputs
        Frontend->>Backend: POST /api/smart-add {"text": "..."}
        Backend->>Database: Fetch current categories
        Database-->>Backend: List of categories (ID, Name)
        
        alt API Call & Parse Success
            Backend->>AI_Service: Request LLM completion (with category list in system prompt)
            AI_Service-->>Backend: Return valid JSON (or markdown-wrapped JSON)
            Backend->>Backend: Clean markdown blocks & parse JSON
            Backend-->>Frontend: HTTP 200 (Parsed task details JSON)
        else LLM or Connection Failure (Fallback)
            Backend->>Backend: Exception caught (timeout, invalid output, etc.)
            Backend->>Backend: Create fallback JSON (raw text as title, error msg as description)
            Backend-->>Frontend: HTTP 200 (Fallback task details JSON)
        end
        
        Frontend->>Backend: POST /tasks (JSON payload)
        Backend->>Database: insert_one(task)
        Database-->>Backend: Inserted document / ID
        Backend-->>Frontend: HTTP 200 (Saved task)
        Frontend->>Frontend: Hide Loading Spinner, Close Modal, Refresh UI & show Success Toast
    end
```
