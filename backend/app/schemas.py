from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool = True
    created_at: datetime

    class Config:
        orm_mode = True

# --- Goal Schemas ---
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: str = "pending"

class GoalCreate(GoalBase):
    pass

class Goal(GoalBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Task Schemas ---
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: bool = False
    goal_id: Optional[int] = None # Link to a goal

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Habit Schemas ---
class HabitBase(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str # e.g., "daily", "weekly", "mon,wed,fri"
    goal_id: Optional[int] = None # Link to a goal

class HabitCreate(HabitBase):
    pass

class Habit(HabitBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Brain Dump Item Schemas ---
class BrainDumpItemBase(BaseModel):
    content: str
    processed: bool = False # Has it been turned into a task/goal/etc.?

class BrainDumpItemCreate(BrainDumpItemBase):
    pass

class BrainDumpItem(BrainDumpItemBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Progress Event Schemas (Example for Habit Tracking) ---
class ProgressEventBase(BaseModel):
    event_date: date
    notes: Optional[str] = None
    # Could be linked to habit_id or goal_id depending on context
    habit_id: Optional[int] = None 
    task_id: Optional[int] = None
    goal_id: Optional[int] = None

class ProgressEventCreate(ProgressEventBase):
    pass

class ProgressEvent(ProgressEventBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# --- Notification Setting Schemas ---
class NotificationSettingBase(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = False # Placeholder for future mobile app
    reminder_frequency: Optional[str] = "daily" # e.g., "daily", "weekly", "never"

class NotificationSettingCreate(NotificationSettingBase):
    pass

class NotificationSetting(NotificationSettingBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None 