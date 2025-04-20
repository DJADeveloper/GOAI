from fastapi import APIRouter, Depends, HTTPException
from typing import List
from .. import schemas # Assuming schemas are in the parent directory
# from ..dependencies import get_current_user # TODO: Uncomment when auth is ready

# Mock User Data (Replace with actual dependency)
class MockUser:
    id = 1
    username = "testuser"

def get_current_user(): # Mock dependency
    return MockUser()

router = APIRouter()

# Mock DB - Replace with actual database interaction
MOCK_GOALS_DB = {}
next_goal_id = 1

@router.post("/", response_model=schemas.Goal)
async def create_goal(goal: schemas.GoalCreate, current_user: MockUser = Depends(get_current_user)):
    # TODO: Add goal to database, link to current_user.id
    global next_goal_id
    new_goal_id = next_goal_id
    MOCK_GOALS_DB[new_goal_id] = {
        "id": new_goal_id,
        "user_id": current_user.id,
        "created_at": "2024-01-01T00:00:00", # Use current time
        **goal.dict()
    }
    next_goal_id += 1
    return MOCK_GOALS_DB[new_goal_id]

@router.get("/", response_model=List[schemas.Goal])
async def read_goals(current_user: MockUser = Depends(get_current_user)):
    # TODO: Fetch goals for current_user.id from database
    # Filter MOCK_GOALS_DB for current user
    user_goals = [g for g in MOCK_GOALS_DB.values() if g["user_id"] == current_user.id]
    return user_goals

@router.get("/{goal_id}", response_model=schemas.Goal)
async def read_goal(goal_id: int, current_user: MockUser = Depends(get_current_user)):
    # TODO: Fetch specific goal for current_user.id from database
    goal = MOCK_GOALS_DB.get(goal_id)
    if not goal or goal["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.put("/{goal_id}", response_model=schemas.Goal)
async def update_goal(goal_id: int, goal_update: schemas.GoalCreate, current_user: MockUser = Depends(get_current_user)):
    # TODO: Update goal in database if it belongs to current_user.id
    goal = MOCK_GOALS_DB.get(goal_id)
    if not goal or goal["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    updated_goal_data = goal_update.dict(exclude_unset=True)
    MOCK_GOALS_DB[goal_id].update(updated_goal_data)
    # Ensure all fields required by Goal schema are present before returning
    # For mock, we assume the DB structure matches the schema
    MOCK_GOALS_DB[goal_id]["title"] = updated_goal_data.get("title", MOCK_GOALS_DB[goal_id]["title"])
    MOCK_GOALS_DB[goal_id]["description"] = updated_goal_data.get("description", MOCK_GOALS_DB[goal_id].get("description"))
    MOCK_GOALS_DB[goal_id]["due_date"] = updated_goal_data.get("due_date", MOCK_GOALS_DB[goal_id].get("due_date"))
    MOCK_GOALS_DB[goal_id]["status"] = updated_goal_data.get("status", MOCK_GOALS_DB[goal_id].get("status"))
    return MOCK_GOALS_DB[goal_id]

@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: int, current_user: MockUser = Depends(get_current_user)):
    # TODO: Delete goal from database if it belongs to current_user.id
    goal = MOCK_GOALS_DB.get(goal_id)
    if not goal or goal["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal_id in MOCK_GOALS_DB:
        del MOCK_GOALS_DB[goal_id]
    return # Return None for 204 status 