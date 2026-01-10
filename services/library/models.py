from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, DECIMAL, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100))
    email = Column(String(150), unique=True, index=True)
    role = Column(String(50))
    # Relationships
    transactions = relationship("LibraryTransaction", back_populates="user")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    profile_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True)
    college_roll_number = Column(String(50), unique=True)
    current_semester = Column(Integer)
    branch_code = Column(String(50))
    
    user = relationship("User", back_populates="student_profile")

class Category(Base):
    __tablename__ = "categories"
    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True)
    description = Column(Text)

class Book(Base):
    __tablename__ = "books"
    book_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    author = Column(String(150))
    isbn = Column(String(20))
    barcode_id = Column(String(50), unique=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"))
    total_copies = Column(Integer, default=1)
    available_copies = Column(Integer, default=1)
    
    transactions = relationship("LibraryTransaction", back_populates="book")

class LibraryTransaction(Base):
    __tablename__ = "library_transactions"
    transaction_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    book_id = Column(Integer, ForeignKey("books.book_id"))
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    return_date = Column(DateTime, nullable=True)
    fine_amount = Column(DECIMAL(10, 2), default=0.00)
    status = Column(String(50), default="ISSUED") # ISSUED, RETURNED, OVERDUE

    user = relationship("User", back_populates="transactions")
    book = relationship("Book", back_populates="transactions")
    fines = relationship("LibraryFine", back_populates="transaction")

class LibraryFine(Base):
    __tablename__ = "library_fines"
    fine_id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("library_transactions.transaction_id"))
    amount = Column(DECIMAL(10, 2))
    is_paid = Column(Boolean, default=False)
    payment_date = Column(DateTime, nullable=True)
    
    transaction = relationship("LibraryTransaction", back_populates="fines")
