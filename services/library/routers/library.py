from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import models, schemas, database

router = APIRouter()

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Book Management ---

@router.get("/books", response_model=List[schemas.Book])
def get_books(category_id: Optional[int] = None, search: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.Book)
    if category_id:
        query = query.filter(models.Book.category_id == category_id)
    if search:
        query = query.filter(models.Book.title.contains(search) | models.Book.author.contains(search))
    return query.offset(skip).limit(limit).all()

@router.post("/books", response_model=schemas.Book)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    db_book = models.Book(**book.dict(), available_copies=book.total_copies)
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

# --- Transactions ---

@router.post("/transaction/issue")
def issue_book(request: schemas.IssueBookRequest, db: Session = Depends(get_db)):
    # Check if book available
    book = db.query(models.Book).filter(models.Book.book_id == request.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.available_copies < 1:
        raise HTTPException(status_code=400, detail="Book not available")
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.user_id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Issue
    due_date = datetime.utcnow() + timedelta(days=request.days)
    transaction = models.LibraryTransaction(
        user_id=request.user_id,
        book_id=request.book_id,
        due_date=due_date,
        status="ISSUED"
    )
    
    book.available_copies -= 1
    db.add(transaction)
    db.commit()
    
    return {"message": "Book issued successfully", "due_date": due_date}

@router.post("/transaction/return")
def return_book(request: schemas.ReturnBookRequest, db: Session = Depends(get_db)):
    # Find active transaction
    transaction = db.query(models.LibraryTransaction).filter(
        models.LibraryTransaction.book_id == request.book_id,
        models.LibraryTransaction.user_id == request.user_id,
        models.LibraryTransaction.status == "ISSUED"
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Active transaction not found")
    
    # Calculate fine
    fine = 0.0
    now = datetime.utcnow()
    if now > transaction.due_date:
        overdue_days = (now - transaction.due_date).days
        fine = overdue_days * 5.0 # 5 Rs per day
    
    transaction.return_date = now
    transaction.status = "RETURNED"
    transaction.fine_amount = fine
    
    # Create fine record if applicable
    if fine > 0:
        fine_record = models.LibraryFine(
            transaction_id=transaction.transaction_id,
            amount=fine
        )
        db.add(fine_record)

    # Validate book exists before updating
    book = db.query(models.Book).filter(models.Book.book_id == request.book_id).first()
    if book:
        book.available_copies += 1
    else:
        # Should technically not happen due to FK, but good safety
        pass
        
    db.commit()
    
    return {"message": "Book returned", "fine_amount": fine}

# --- Student View ---

@router.get("/student/my-books", response_model=List[schemas.TransactionResponse])
def get_my_books(user_id: int, db: Session = Depends(get_db)):
    # In real app, get user_id from token
    return db.query(models.LibraryTransaction).filter(
        models.LibraryTransaction.user_id == user_id,
        models.LibraryTransaction.status == "ISSUED"
    ).all()

# --- Stats & Admin ---

@router.get("/stats", response_model=schemas.LibraryStats)
def get_stats(db: Session = Depends(get_db)):
    total_books = db.query(func.sum(models.Book.total_copies)).scalar() or 0
    issued_books = db.query(models.LibraryTransaction).filter(models.LibraryTransaction.status == "ISSUED").count()
    overdue_books = db.query(models.LibraryTransaction).filter(
        models.LibraryTransaction.status == "ISSUED", 
        models.LibraryTransaction.due_date < datetime.utcnow()
    ).count()
    
    # Handle possible None for sum
    total_fines = db.query(func.sum(models.LibraryFine.amount)).filter(models.LibraryFine.is_paid == True).scalar() or 0.0
    pending_fines = db.query(func.sum(models.LibraryFine.amount)).filter(models.LibraryFine.is_paid == False).scalar() or 0.0
    
    return {
        "total_books": int(total_books),
        "issued_books": issued_books,
        "overdue_books": overdue_books,
        "total_fines_collected": float(total_fines),
        "pending_fines": float(pending_fines)
    }

@router.get("/admin/overdue", response_model=List[schemas.TransactionResponse])
def get_overdue_books(db: Session = Depends(get_db)):
    return db.query(models.LibraryTransaction).filter(
        models.LibraryTransaction.status == "ISSUED",
        models.LibraryTransaction.due_date < datetime.utcnow()
    ).all()
