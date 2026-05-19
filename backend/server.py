from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Файлы
USERS_FILE = "users.json"
PROJECTS_FILE = "projects.json"
TASKS_FILE = "tasks.json"

def load_data(filename, default_dict=False):
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return json.load(f)
    return {} if default_dict else []

def save_data(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

# Инициализация пользователей
if not os.path.exists(USERS_FILE):
    save_data(USERS_FILE, {
        "admin": {"password": "admin123", "email": "admin@example.com", "role": "admin", "created_at": datetime.now().isoformat()},
        "editor1": {"password": "editor123", "email": "editor1@example.com", "role": "editor", "created_at": datetime.now().isoformat()},
        "user1": {"password": "user123", "email": "user1@example.com", "role": "user", "created_at": datetime.now().isoformat()}
    })

if not os.path.exists(PROJECTS_FILE):
    save_data(PROJECTS_FILE, [])

if not os.path.exists(TASKS_FILE):
    save_data(TASKS_FILE, [])

# Модели
class LoginData(BaseModel):
    username: str
    password: str

class RegisterData(BaseModel):
    username: str
    password: str
    email: str

class ProjectData(BaseModel):
    id: Optional[int] = None
    name: str
    description: str = ""
    status: str = "active"
    assignees: List[str] = []
    deadline: Optional[str] = None

class TaskData(BaseModel):
    id: Optional[int] = None
    project_id: int
    title: str
    description: str = ""
    status: str = "todo"
    priority: str = "medium"
    tags: List[str] = []
    assignee: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    created_by: str

# API
@app.post("/api/login")
def login(data: LoginData):
    users = load_data(USERS_FILE, default_dict=True)
    if data.username in users and users[data.username]["password"] == data.password:
        return {"success": True, "username": data.username, "role": users[data.username]["role"], "email": users[data.username]["email"]}
    raise HTTPException(401, "Invalid credentials")

@app.post("/api/register")
def register(data: RegisterData):
    users = load_data(USERS_FILE, default_dict=True)
    if data.username in users:
        raise HTTPException(400, "Username exists")
    users[data.username] = {"password": data.password, "email": data.email, "role": "user", "created_at": datetime.now().isoformat()}
    save_data(USERS_FILE, users)
    return {"success": True}

@app.get("/api/all-users")
def get_all_users(username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    return list(users.keys())

@app.get("/api/users")
def get_users(username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    if users[username].get("role") == "admin":
        return [{"username": u, "email": d["email"], "role": d.get("role", "user"), "created_at": d.get("created_at")} for u, d in users.items()]
    return [{"username": username, "email": users[username]["email"], "role": users[username].get("role", "user")}]

@app.post("/api/admin/users")
def create_user(data: dict, admin_username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if admin_username not in users or users[admin_username].get("role") != "admin":
        raise HTTPException(403, "Only admin can create users")
    if data["username"] in users:
        raise HTTPException(400, "Username exists")
    users[data["username"]] = {"password": data["password"], "email": data["email"], "role": data["role"], "created_at": datetime.now().isoformat()}
    save_data(USERS_FILE, users)
    return {"success": True}

@app.put("/api/users/{target_username}")
def update_user(target_username: str, data: dict, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users or users[username].get("role") != "admin":
        raise HTTPException(403, "Permission denied")
    if target_username not in users:
        raise HTTPException(404, "User not found")
    if "email" in data:
        users[target_username]["email"] = data["email"]
    if "role" in data:
        users[target_username]["role"] = data["role"]
    save_data(USERS_FILE, users)
    return {"success": True}

@app.delete("/api/users/{target_username}")
def delete_user(target_username: str, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users or users[username].get("role") != "admin":
        raise HTTPException(403, "Permission denied")
    if target_username == username:
        raise HTTPException(400, "Cannot delete yourself")
    if target_username not in users:
        raise HTTPException(404, "User not found")
    del users[target_username]
    save_data(USERS_FILE, users)
    return {"success": True}

@app.get("/api/projects")
def get_projects(username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    return load_data(PROJECTS_FILE)

@app.post("/api/projects")
def create_project(data: dict, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    projects = load_data(PROJECTS_FILE)
    new_id = max([p.get("id", 0) for p in projects] + [0]) + 1
    new_project = {
        "id": new_id,
        "name": data["name"],
        "description": data.get("description", ""),
        "status": data.get("status", "active"),
        "assignees": data.get("assignees", []),
        "deadline": data.get("deadline"),
        "created_at": datetime.now().isoformat(),
        "created_by": username
    }
    projects.append(new_project)
    save_data(PROJECTS_FILE, projects)
    return new_project

@app.put("/api/projects/{project_id}")
def update_project(project_id: int, data: dict, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    projects = load_data(PROJECTS_FILE)
    for i, p in enumerate(projects):
        if p["id"] == project_id:
            projects[i] = {**p, "name": data["name"], "description": data.get("description", ""), "status": data.get("status", "active"), "assignees": data.get("assignees", []), "deadline": data.get("deadline")}
            save_data(PROJECTS_FILE, projects)
            return projects[i]
    raise HTTPException(404, "Project not found")

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users or users[username].get("role") != "admin":
        raise HTTPException(403, "Permission denied")
    projects = load_data(PROJECTS_FILE)
    projects = [p for p in projects if p["id"] != project_id]
    save_data(PROJECTS_FILE, projects)
    return {"success": True}

@app.get("/api/projects/{project_id}/tasks")
def get_tasks(project_id: int, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_data(TASKS_FILE)
    return [t for t in tasks if t["project_id"] == project_id]

@app.post("/api/tasks")
def create_task(data: dict, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_data(TASKS_FILE)
    new_id = max([t.get("id", 0) for t in tasks] + [0]) + 1
    new_task = {
        "id": new_id,
        "project_id": data["project_id"],
        "title": data["title"],
        "description": data.get("description", ""),
        "status": data.get("status", "todo"),
        "priority": data.get("priority", "medium"),
        "tags": data.get("tags", []),
        "assignee": data.get("assignee"),
        "start_date": data.get("start_date") or datetime.now().date().isoformat(),
        "due_date": data.get("due_date") or (datetime.now().date().isoformat()),
        "created_by": username,
        "created_at": datetime.now().isoformat()
    }
    tasks.append(new_task)
    save_data(TASKS_FILE, tasks)
    return new_task

@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, data: dict, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_data(TASKS_FILE)
    for i, t in enumerate(tasks):
        if t["id"] == task_id:
            tasks[i].update(data)
            save_data(TASKS_FILE, tasks)
            return tasks[i]
    raise HTTPException(404, "Task not found")

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, username: str):
    users = load_data(USERS_FILE, default_dict=True)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_data(TASKS_FILE)
    tasks = [t for t in tasks if t["id"] != task_id]
    save_data(TASKS_FILE, tasks)
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("🚀 Server running on http://0.0.0.0:8000")
    print("Admin: admin / admin123")
    print("="*50 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
