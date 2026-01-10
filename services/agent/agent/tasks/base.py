from pydantic import BaseModel , Field 
from enum import Enum
from typing import Dict , Any , Optional
from datetime import datetime , timezone
from zoneinfo import ZoneInfo

class TaskStatus(str , Enum):
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AgentTask(BaseModel):
    task_id : str = Field(... , description = "Unique task identifier")
    user_id : str = Field(... , description = "Owner of the task")

    task_type : str = Field(... , description = "Usually library_search | notice_fetch | erp_request | many more.. ")
    intent : str = Field(... , description = "Natural language summary of what user wants" )
    payload : Dict[str,Any] = Field(... , description = "Validated, structured inputs only")

    status : TaskStatus = Field(default = TaskStatus.PENDING , frozen = True)
    result : Optional[Dict[str,Any]] = None
    error : Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    