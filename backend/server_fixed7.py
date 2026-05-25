from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime
import re

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

def load_dict(filename):
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            data = json.load(f)
            if isinstance(data, list):
                return {}
            return data
    return {}

def load_list(filename):
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            data = json.load(f)
            if isinstance(data, dict):
                return []
            return data
    return []

def save_data(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

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

# Helper functions
def extract_mentions(text: str):
    return re.findall(r'@([\w.]+)', text)

def create_notification(user: str, message: str, notif_type: str = "mention", task_id: int = None, project_id: int = None, comment_id: int = None):
    notifications = load_list(NOTIFICATIONS_FILE)
    new_id = len(notifications) + 1
    new_notification = {
        "id": new_id,
        "user": user,
        "message": message,
        "read": False,
        "type": notif_type,
        "task_id": task_id,
        "project_id": project_id,
        "comment_id": comment_id,
        "created_at": datetime.now().isoformat()
    }
    notifications.append(new_notification)
    save_data(NOTIFICATIONS_FILE, notifications)
    return new_notification

# API Users
@app.post("/api/login")
def login(data: LoginData):
    users = load_dict(USERS_FILE)
    if data.username in users and users[data.username]["password"] == data.password:
        return {"success": True, "username": data.username, "role": users[data.username]["role"], "email": users[data.username]["email"]}
    raise HTTPException(401, "Invalid credentials")

@app.post("/api/register")
def register(data: RegisterData):
    users = load_dict(USERS_FILE)
    if data.username in users:
        raise HTTPException(400, "Username exists")
    users[data.username] = {"password": data.password, "email": data.email, "role": "user", "created_at": datetime.now().isoformat()}
    save_data(USERS_FILE, users)
    return {"success": True}

@app.get("/api/all-users")
def get_all_users(username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    return list(users.keys())

@app.get("/api/projects/{project_id}/users")
def get_project_users(project_id: int, username: str):
    users = load_dict(USERS_FILE)
    projects = load_list(PROJECTS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    project = next((p for p in projects if p["id"] == project_id), None)
    if not project:
        raise HTTPException(404, "Project not found")
    return project.get("assignees", [])

# API Projects
@app.get("/api/projects")
def get_projects(username: str):
    users = load_dict(USERS_FILE)
    projects = load_list(PROJECTS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    role = users[username].get("role", "user")
    if role in ["admin", "editor"]:
        return projects
    return [p for p in projects if username in p.get("assignees", [])]

@app.post("/api/projects")
def create_project(project: ProjectData, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    role = users[username].get("role", "user")
    if role not in ["admin", "editor"]:
        raise HTTPException(403, "Permission denied")
    projects = load_list(PROJECTS_FILE)
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
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    projects = load_list(PROJECTS_FILE)
    for i, p in enumerate(projects):
        if p["id"] == project_id:
            projects[i] = {**p, "name": project.name, "description": project.description, "status": project.status, "assignees": project.assignees, "deadline": project.deadline}
            save_data(PROJECTS_FILE, projects)
            return projects[i]
    raise HTTPException(404, "Project not found")

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, username: str):
    users = load_dict(USERS_FILE)
    if username not in users or users[username].get("role") != "admin":
        raise HTTPException(403, "Permission denied")
    projects = load_list(PROJECTS_FILE)
    tasks = load_list(TASKS_FILE)
    projects = [p for p in projects if p["id"] != project_id]
    tasks = [t for t in tasks if t["project_id"] != project_id]
    save_data(PROJECTS_FILE, projects)
    save_data(TASKS_FILE, tasks)
    return {"success": True}

# API Tasks
@app.get("/api/projects/{project_id}/tasks")
def get_tasks(project_id: int, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_list(TASKS_FILE)
    role = users[username].get("role", "user")
    project_tasks = [t for t in tasks if t["project_id"] == project_id]
    if role in ["admin", "editor"]:
        return project_tasks
    return [t for t in project_tasks if username in t.get("assignees", [])]

@app.post("/api/tasks")
def create_task(task: TaskData, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_list(TASKS_FILE)
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
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_list(TASKS_FILE)
    for i, t in enumerate(tasks):
        if t["id"] == task_id:
            tasks[i].update(task_data)
            save_data(TASKS_FILE, tasks)
            return tasks[i]
    raise HTTPException(404, "Task not found")

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_list(TASKS_FILE)
    tasks = [t for t in tasks if t["id"] != task_id]
    save_data(TASKS_FILE, tasks)
    return {"success": True}

@app.get("/api/tasks/{task_id}")
def get_task_by_id(task_id: int, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    tasks = load_list(TASKS_FILE)
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        raise HTTPException(404, "Task not found")
    return task

# API Comments for Tasks
@app.get("/api/tasks/{task_id}/comments")
def get_task_comments(task_id: int, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    comments = load_dict(COMMENTS_FILE)
    key = f"task_{task_id}"
    return comments.get(key, [])

@app.post("/api/comments")
def create_task_comment(data: dict, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")

    comments = load_dict(COMMENTS_FILE)
    task_id = data.get("task_id")
    key = f"task_{task_id}"

    if key not in comments:
        comments[key] = []

    new_id = len(comments[key]) + 1
    new_comment = {
        "id": new_id,
        "user": data.get("user"),
        "text": data.get("text"),
        "parent_id": data.get("parent_id"),
        "created_at": datetime.now().isoformat()
    }
    comments[key].append(new_comment)
    save_data(COMMENTS_FILE, comments)

    # Создаём уведомления для упомянутых пользователей
    mentions = extract_mentions(data.get("text", ""))
    tasks = load_list(TASKS_FILE)
    task = next((t for t in tasks if t["id"] == task_id), None)
    task_title = task["title"] if task else "task"

    for mentioned_user in mentions:
        if mentioned_user != username:
            create_notification(
                mentioned_user,
                f"{username} mentioned you in task \"{task_title}\"",
                "mention",
                task_id=task_id,
                comment_id=new_id
            )

    return new_comment

# API Comments for Projects
@app.get("/api/projects/{project_id}/comments")
def get_project_comments(project_id: int, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")
    comments = load_dict(COMMENTS_FILE)
    key = f"project_{project_id}"
    return comments.get(key, [])

@app.post("/api/comments-project")
def create_project_comment(data: dict, username: str):
    users = load_dict(USERS_FILE)
    if username not in users:
        raise HTTPException(401, "Unauthorized")

    comments = load_dict(COMMENTS_FILE)
    project_id = data.get("project_id")
    key = f"project_{project_id}"

    if key not in comments:
        comments[key] = []

    new_id = len(comments[key]) + 1
    new_comment = {
        "id": new_id,
        "user": data.get("user"),
        "text": data.get("text"),
        "parent_id": data.get("parent_id"),
        "created_at": datetime.now().isoformat()
    }
    comments[key].append(new_comment)
    save_data(COMMENTS_FILE, comments)

    # Создаём уведомления для упомянутых пользователей
    mentions = extract_mentions(data.get("text", ""))
    projects = load_list(PROJECTS_FILE)
    project = next((p for p in projects if p["id"] == project_id), None)
    project_name = project["name"] if project else "project"

    for mentioned_user in mentions:
        if mentioned_user != username:
            create_notification(
                mentioned_user,
                f"{username} mentioned you in project \"{project_name}\"",
                "mention",
                project_id=project_id,
                comment_id=new_id
            )

    return new_comment

# API Notifications
@app.get("/api/notifications/{username}")
def get_notifications(username: str, current_user: str):
    users = load_dict(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    notifications = load_list(NOTIFICATIONS_FILE)
    user_notifications = [n for n in notifications if n.get("user") == username]
    user_notifications.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return user_notifications

@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, current_user: str):
    users = load_dict(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    notifications = load_list(NOTIFICATIONS_FILE)
    for n in notifications:
        if n.get("id") == notification_id and n.get("user") == current_user:
            n["read"] = True
            save_data(NOTIFICATIONS_FILE, notifications)
            return {"success": True}
    raise HTTPException(404, "Notification not found")

# API Messages
@app.get("/api/messages/{username}")
def get_messages(username: str, current_user: str):
    users = load_dict(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    messages = load_list(MESSAGES_FILE)
    user_messages = [m for m in messages if m.get("to_user") == username or m.get("from_user") == username]
    user_messages.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return user_messages

@app.post("/api/messages")
def send_message(data: dict, current_user: str):
    users = load_dict(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    messages = load_list(MESSAGES_FILE)
    new_id = len(messages) + 1
    new_message = {
        "id": new_id,
        "from_user": data.get("from_user"),
        "to_user": data.get("to_user"),
        "text": data.get("text"),
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    messages.append(new_message)
    save_data(MESSAGES_FILE, messages)

    create_notification(
        data.get("to_user"),
        f"New message from {data.get('from_user')}: {data.get('text')[:50]}",
        "message"
    )

    return new_message

@app.put("/api/messages/{message_id}/read")
def mark_message_read(message_id: int, current_user: str):
    users = load_dict(USERS_FILE)
    if current_user not in users:
        raise HTTPException(401, "Unauthorized")
    messages = load_list(MESSAGES_FILE)
    for m in messages:
        if m.get("id") == message_id and m.get("to_user") == current_user:
            m["read"] = True
            save_data(MESSAGES_FILE, messages)
            return {"success": True}
    raise HTTPException(404, "Message not found")

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Server running on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
