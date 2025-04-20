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
MOCK_BRAINDUMP_DB = {}
next_item_id = 1

@router.post("/", response_model=schemas.BrainDumpItem)
async def create_braindump_item(item: schemas.BrainDumpItemCreate, current_user: MockUser = Depends(get_current_user)):
    global next_item_id
    new_id = next_item_id
    MOCK_BRAINDUMP_DB[new_id] = {
        "id": new_id,
        "user_id": current_user.id,
        "created_at": "2024-01-01T00:00:00",
        **item.dict()
    }
    next_item_id += 1
    return MOCK_BRAINDUMP_DB[new_id]

@router.get("/", response_model=List[schemas.BrainDumpItem])
async def read_braindump_items(current_user: MockUser = Depends(get_current_user)):
    user_items = [i for i in MOCK_BRAINDUMP_DB.values() if i["user_id"] == current_user.id]
    return user_items

@router.put("/{item_id}/process", response_model=schemas.BrainDumpItem)
async def process_braindump_item(item_id: int, current_user: MockUser = Depends(get_current_user)):
    item = MOCK_BRAINDUMP_DB.get(item_id)
    if not item or item["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")
    
    MOCK_BRAINDUMP_DB[item_id]["processed"] = True
    # Add logic here to potentially create a task or goal from the item
    return MOCK_BRAINDUMP_DB[item_id]

@router.delete("/{item_id}", status_code=204)
async def delete_braindump_item(item_id: int, current_user: MockUser = Depends(get_current_user)):
    item = MOCK_BRAINDUMP_DB.get(item_id)
    if not item or item["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found")
    if item_id in MOCK_BRAINDUMP_DB:
        del MOCK_BRAINDUMP_DB[item_id]
    return 