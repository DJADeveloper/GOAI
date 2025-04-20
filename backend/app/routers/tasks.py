from fastapi import APIRouter, Depends, HTTPException
from typing import List
from .. import schemas

# Mock User Data (Replace with actual dependency)
class MockUser:
    id = 1
    username = "testuser"

def get_current_user(): # Mock dependency
    return MockUser()

router = APIRouter()

# Mock DB - Replace with actual database interaction
MOCK_TASKS_DB = {}
next_task_id = 1

@router.post("/", response_model=schemas.Task)
async def create_task(task: schemas.TaskCreate, current_user: MockUser = Depends(get_current_user)):
    global next_task_id
    new_task_id = next_task_id
    MOCK_TASKS_DB[new_task_id] = {
        "id": new_task_id,
        "user_id": current_user.id,
        "created_at": "2024-01-01T00:00:00", # Use current time
        **task.dict()
    }
    next_task_id += 1
    return MOCK_TASKS_DB[new_task_id]

@router.get("/", response_model=List[schemas.Task])
async def read_tasks(current_user: MockUser = Depends(get_current_user)):
    user_tasks = [t for t in MOCK_TASKS_DB.values() if t["user_id"] == current_user.id]
    return user_tasks

@router.get("/{task_id}", response_model=schemas.Task)
async def read_task(task_id: int, current_user: MockUser = Depends(get_current_user)):
    task = MOCK_TASKS_DB.get(task_id)
    if not task or task["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=schemas.Task)
async def update_task(task_id: int, task_update: schemas.TaskCreate, current_user: MockUser = Depends(get_current_user)):
    task = MOCK_TASKS_DB.get(task_id)
    if not task or task["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task_data = task_update.dict(exclude_unset=True)
    MOCK_TASKS_DB[task_id].update(updated_task_data)
    # Ensure all fields required by Task schema are present before returning
    for key, value in updated_task_data.items():
         MOCK_TASKS_DB[task_id][key] = value
    # Ensure boolean 'completed' field is present
    if 'completed' not in MOCK_TASKS_DB[task_id]:
         MOCK_TASKS_DB[task_id]['completed'] = False # Default if not provided
         
    return MOCK_TASKS_DB[task_id]

@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, current_user: MockUser = Depends(get_current_user)):
    task = MOCK_TASKS_DB.get(task_id)
    if not task or task["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    if task_id in MOCK_TASKS_DB:
        del MOCK_TASKS_DB[task_id]
    return 