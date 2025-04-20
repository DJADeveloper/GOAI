from fastapi import APIRouter, Depends, HTTPException
from typing import List
from .. import schemas

# Mock User Data
class MockUser:
    id = 1
    username = "testuser"

def get_current_user(): # Mock dependency
    return MockUser()

router = APIRouter()

# Mock DB
MOCK_HABITS_DB = {}
next_habit_id = 1

@router.post("/", response_model=schemas.Habit)
async def create_habit(habit: schemas.HabitCreate, current_user: MockUser = Depends(get_current_user)):
    global next_habit_id
    new_habit_id = next_habit_id
    MOCK_HABITS_DB[new_habit_id] = {
        "id": new_habit_id,
        "user_id": current_user.id,
        "created_at": "2024-01-01T00:00:00",
        **habit.dict()
    }
    next_habit_id += 1
    return MOCK_HABITS_DB[new_habit_id]

@router.get("/", response_model=List[schemas.Habit])
async def read_habits(current_user: MockUser = Depends(get_current_user)):
    user_habits = [h for h in MOCK_HABITS_DB.values() if h["user_id"] == current_user.id]
    return user_habits

@router.get("/{habit_id}", response_model=schemas.Habit)
async def read_habit(habit_id: int, current_user: MockUser = Depends(get_current_user)):
    habit = MOCK_HABITS_DB.get(habit_id)
    if not habit or habit["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit

@router.put("/{habit_id}", response_model=schemas.Habit)
async def update_habit(habit_id: int, habit_update: schemas.HabitCreate, current_user: MockUser = Depends(get_current_user)):
    habit = MOCK_HABITS_DB.get(habit_id)
    if not habit or habit["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    updated_habit_data = habit_update.dict(exclude_unset=True)
    MOCK_HABITS_DB[habit_id].update(updated_habit_data)
    for key, value in updated_habit_data.items():
         MOCK_HABITS_DB[habit_id][key] = value
    return MOCK_HABITS_DB[habit_id]

@router.delete("/{habit_id}", status_code=204)
async def delete_habit(habit_id: int, current_user: MockUser = Depends(get_current_user)):
    habit = MOCK_HABITS_DB.get(habit_id)
    if not habit or habit["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Habit not found")
    if habit_id in MOCK_HABITS_DB:
        del MOCK_HABITS_DB[habit_id]
    return

# --- Habit Progress Tracking (Example) ---
# Mock DB for Progress
MOCK_HABIT_PROGRESS_DB = {}
next_progress_id = 1

@router.post("/{habit_id}/progress", response_model=schemas.ProgressEvent)
async def log_habit_progress(habit_id: int, progress: schemas.ProgressEventCreate, current_user: MockUser = Depends(get_current_user)):
    # Check if habit exists and belongs to user
    habit = MOCK_HABITS_DB.get(habit_id)
    if not habit or habit["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Habit not found")

    global next_progress_id
    new_progress_id = next_progress_id
    MOCK_HABIT_PROGRESS_DB[new_progress_id] = {
        "id": new_progress_id,
        "user_id": current_user.id,
        "habit_id": habit_id,
        "created_at": "2024-01-01T00:00:00",
        **progress.dict()
    }
    next_progress_id += 1
    return MOCK_HABIT_PROGRESS_DB[new_progress_id]

@router.get("/{habit_id}/progress", response_model=List[schemas.ProgressEvent])
async def get_habit_progress(habit_id: int, current_user: MockUser = Depends(get_current_user)):
     # Check if habit exists and belongs to user
    habit = MOCK_HABITS_DB.get(habit_id)
    if not habit or habit["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    habit_progress = [p for p in MOCK_HABIT_PROGRESS_DB.values() if p["user_id"] == current_user.id and p["habit_id"] == habit_id]
    return habit_progress 