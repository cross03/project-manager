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
COMMENTS_FILE = "comments.json"
MESSAGES_FILE = "messages.json"
NOTIFICATIONS_FILE = "notifications.json"

def load_data(filename):
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            return json.load(f)
    return {} if filename.endswith('.json') else []

def save_data(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

# Инициализация
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

if not os.path.exists(COMMENTS_FILE):
    save_data(COMMENTS_FILE, {})

if not os.path.exists(MESSAGES_FILE):
    save_data(MESSAGES_FILE, [])

if not os.path.exists(NOTIFICATIONS_FILE):
    save_data(NOTIFICATIONS_FILE, [])

# Модели
class LoginData(BaseModel):
    username: str
    password: str

class RegisterData(BaseModel):
    username: str
    password: str
    email: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    role: str = "user"

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

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
    assignees: List[str] = []
    due_date: Optional[str] = None
    created_by: str

class CommentData(BaseModel):
    task_id: int
    user: str
    text: str

class MessageData(BaseModel):
    from_user: str
    to_user: str
    text: str
    read: bool = False

class NotificationData(BaseModel):
    user: str
    message: str
    read: bool = False
    created_at: str

# API Users
@app.post("/api/login")
def login(data: LoginData):
    users = load_data(USERS_FILE)
    if data.username in users and users[data.username]["password"] == data.password:
        return {"success": True, "username": data.username, "role": users[data.username]["role"], "email": users[data.username]["email"]}
    raise HTTPException(401, "Invalid credentials")

@app.post("/api/register")
def register(data: RegisterData):
    users = load_data(USERS_FILE)
    if data.username in users:
        raise HTTPException(400, "Username exists")
    users[data.username] = {"password": data.password, "email": data.email, "role": "user", "created_at": datetime.now().isoformat()}
    save_data(USERS_FILE, users)
    return {"success": True}

@app.get("/api/all-users")
def get_all_users(username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    return list(users.keys())

@app.get("/api/projects/{project_id}/users")
def get_project_users(project_id: int, username: str):
    users = load_data(USERS_FILE)
    projects = load_data(PROJECTS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    project = next((p for p in projects if p["id"] == project_id), None)
    if not project:
        raise HTTPException(404, "Project not found")
    return project.get("assignees", [])

@app.post("/api/admin/users")
def create_user(data: UserCreate, admin_username: str):
    users = load_data(USERS_FILE)
    if admin_username not in users or users[admin_username].get("role") != "admin":
        raise HTTPException(403, "Only admin can create users")
    if data.username in users:
        raise HTTPException(400, "Username exists")
    users[data.username] = {"password": data.password, "email": data.email, "role": data.role, "created_at": datetime.now().isoformat()}
    save_data(USERS_FILE, users)
    return {"success": True}

@app.get("/api/users")
def get_users(username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    if users[username].get("role") == "admin":
        return [{"username": u, "email": d["email"], "role": d.get("role", "user"), "created_at": d.get("created_at")} for u, d in users.items()]
    return [{"username": username, "email": users[username]["email"], "role": users[username].get("role", "user")}]

@app.put("/api/users/{target_username}")
def update_user(target_username: str, data: UserUpdate, username: str):
    users = load_data(USERS_FILE)
    if username not in users or users[username].get("role") != "admin":
        raise HTTPException(403, "Permission denied")
    if target_username not in users:
        raise HTTPException(404, "User not found")
    if data.email:
        users[target_username]["email"] = data.email
    if data.role:
        users[target_username]["role"] = data.role
    save_data(USERS_FILE, users)
    return {"success": True}

@app.delete("/api/users/{target_username}")
def delete_user(target_username: str, username: str):
    users = load_data(USERS_FILE)
    if username not in users or users[username].get("role") != "admin":
        raise HTTPException(403, "Permission denied")
    if target_username == username:
        raise HTTPException(400, "Cannot delete yourself")
    if target_username not in users:
        raise HTTPException(404, "User not found")
    del users[target_username]
    save_data(USERS_FILE, users)
    return {"success": True}

# API Projects
@app.get("/api/projects")
def get_projects(username: str):
    users = load_data(USERS_FILE)
    projects = load_data(PROJECTS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    role = users[username].get("role", "user")
    if role in ["admin", "editor"]:
        return projects
    return [p for p in projects if username in p.get("assignees", [])]

@app.post("/api/projects")
def create_project(project: ProjectData, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    role = users[username].get("role", "user")
    if role not in ["admin", "editor"]:
        raise HTTPException(403, "Permission denied")
    projects = load_data(PROJECTS_FILE)
    new_id = max([p.get("id", 0) for p in projects] + [0]) + 1
    new_project = {
        "id": new_id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "assignees": project.assignees,
        "deadline": project.deadline,
        "created_at": datetime.now().isoformat(),
        "created_by": username
    }
    projects.append(new_project)
    save_data(PROJECTS_FILE, projects)
    return new_project

@app.put("/api/projects/{project_id}")
def update_project(project_id: int, project: ProjectData, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    role = users[username].get("role", "user")
    if role not in ["admin", "editor"]:
        raise HTTPException(403, "Permission denied")
    projects = load_data(PROJECTS_FILE)
    for i, p in enumerate(projects):
        if p["id"] == project_id:
            projects[i] = {**p, "name": project.name, "description": project.description, "status": project.status, "assignees": project.assignees, "deadline": project.deadline}
            save_data(PROJECTS_FILE, projects)
            return projects[i]
    raise HTTPException(404, "Project not found")

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, username: str):
    users = load_data(USERS_FILE)
    if username not in users or users[username].get("role") != "admin":
        raise HTTPException(403, "Permission denied")
    projects = load_data(PROJECTS_FILE)
    tasks = load_data(TASKS_FILE)
    projects = [p for p in projects if p["id"] != project_id]
    tasks = [t for t in tasks if t["project_id"] != project_id]
    save_data(PROJECTS_FILE, projects)
    save_data(TASKS_FILE, tasks)
    return {"success": True}

# API Tasks
@app.get("/api/projects/{project_id}/tasks")
def get_tasks(project_id: int, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_data(TASKS_FILE)
    return [t for t in tasks if t["project_id"] == project_id]

@app.post("/api/tasks")
def create_task(task: TaskData, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_data(TASKS_FILE)
    new_id = max([t.get("id", 0) for t in tasks] + [0]) + 1
    new_task = {
        "id": new_id,
        "project_id": task.project_id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "tags": task.tags,
        "assignees": task.assignees,
        "due_date": task.due_date,
        "created_by": username,
        "created_at": datetime.now().isoformat()
    }
    tasks.append(new_task)
    save_data(TASKS_FILE, tasks)
    return new_task

@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, task_data: dict, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_data(TASKS_FILE)
    for i, t in enumerate(tasks):
        if t["id"] == task_id:
            tasks[i].update(task_data)
            save_data(TASKS_FILE, tasks)
            return tasks[i]
    raise HTTPException(404, "Task not found")

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    # Editor может удалять задачи
    tasks = load_data(TASKS_FILE)
    tasks = [t for t in tasks if t["id"] != task_id]
    save_data(TASKS_FILE, tasks)
    return {"success": True}

# API Comments
@app.get("/api/tasks/{task_id}/comments")
def get_task_comments(task_id: int, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    comments = load_data(COMMENTS_FILE)
    return comments.get(str(task_id), [])

@app.post("/api/comments")
def create_comment(comment: CommentData, username: str):
    users = load_data(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    comments = load_data(COMMENTS_FILE)
    task_id_str = str(comment.task_id)
    if task_id_str not in comments:
        comments[task_id_str] = []
    new_comment = {
        "id": len(comments[task_id_str]) + 1,
        "user": comment.user,
        "text": comment.text,
        "created_at": datetime.now().isoformat()
    }
    comments[task_id_str].append(new_comment)
    save_data(COMMENTS_FILE, comments)
    return new_comment

# API Messages
@app.get("/api/messages/{username}")
def get_messages(username: str, current_user: str):
    users = load_data(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    messages = load_data(MESSAGES_FILE)
    user_messages = [m for m in messages if m["to_user"] == username or m["from_user"] == username]
    return user_messages

@app.post("/api/messages")
def send_message(message: MessageData, current_user: str):
    users = load_data(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    messages = load_data(MESSAGES_FILE)
    new_message = {
        "id": len(messages) + 1,
        "from_user": message.from_user,
        "to_user": message.to_user,
        "text": message.text,
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    messages.append(new_message)
    save_data(MESSAGES_FILE, messages)
    return new_message

@app.put("/api/messages/{message_id}/read")
def mark_message_read(message_id: int, current_user: str):
    users = load_data(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    messages = load_data(MESSAGES_FILE)
    for m in messages:
        if m["id"] == message_id and m["to_user"] == current_user:
            m["read"] = True
            save_data(MESSAGES_FILE, messages)
            return {"success": True}
    raise HTTPException(404, "Message not found")

# API Notifications
@app.get("/api/notifications/{username}")
def get_notifications(username: str, current_user: str):
    users = load_data(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    notifications = load_data(NOTIFICATIONS_FILE)
    user_notifications = [n for n in notifications if n["user"] == username]
    return user_notifications

@app.post("/api/notifications")
def create_notification(notification: NotificationData, current_user: str):
    users = load_data(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    notifications = load_data(NOTIFICATIONS_FILE)
    new_notification = {
        "id": len(notifications) + 1,
        "user": notification.user,
        "message": notification.message,
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    notifications.append(new_notification)
    save_data(NOTIFICATIONS_FILE, notifications)
    return new_notification

@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: str):
    users = load_data(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    notifications = load_data(NOTIFICATIONS_FILE)
    for n in notifications:
        if n["id"] == notification_id and n["user"] == current_user:
            n["read"] = True
            save_data(NOTIFICATIONS_FILE, notifications)
            return {"success": True}
    raise HTTPException(404, "Notification not found")

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Server running on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
