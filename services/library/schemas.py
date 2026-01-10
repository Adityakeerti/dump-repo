from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Book Schemas
class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    isbn: Optional[str] = None
    barcode_id: Optional[str] = None
    category_id: Optional[int] = None
    total_copies: int = 1

class BookCreate(BookBase):
    pass

class Book(BookBase):
    book_id: int
    available_copies: int
    
    class Config:
        orm_mode = True

# Transaction Schemas
class IssueBookRequest(BaseModel):
    user_id: int
    book_id: int
    days: int = 14

class ReturnBookRequest(BaseModel):
    book_id: int
    user_id: int

class TransactionResponse(BaseModel):
    transaction_id: int
    user_id: int
    book_id: int
    issue_date: datetime
    due_date: datetime
    return_date: Optional[datetime]
    fine_amount: float
    status: str

    class Config:
        orm_mode = True

# Stats Schemas
class LibraryStats(BaseModel):
    total_books: int
    issued_books: int
    overdue_books: int
    total_fines_collected: float
    pending_fines: float
