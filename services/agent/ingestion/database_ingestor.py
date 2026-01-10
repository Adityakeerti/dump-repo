"""
Database Ingestor - Syncs MySQL campus data into ChromaDB vector store
Provides comprehensive RAG access to library catalog, courses, users, etc.
"""

import mysql.connector
from typing import List, Dict, Any
import logging
from datetime import datetime

from memory.vector.faiss_store import FAISSVectorStore
from config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseIngestor:
    """
    Ingests campus data from MySQL into ChromaDB for RAG.
    """
    
    def __init__(self, db_config: Dict[str, str]):
        """
        Initialize with database connection config.
        
        Args:
            db_config: Dict with keys: host, user, password, database
        """
        self.db_config = db_config
        self.vector_store = FAISSVectorStore(path=settings.vector_path)
        
    def _get_connection(self):
        """Create MySQL connection."""
        return mysql.connector.connect(**self.db_config)
    
    def ingest_library_catalog(self) -> int:
        """
        Ingest library books into vector store.
        Returns count of books ingested.
        """
        logger.info("Starting library catalog ingestion...")
        
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Query all books from library with category join
            cursor.execute("""
                SELECT 
                    b.book_id, b.title, b.author, b.isbn, 
                    c.name as category_name, b.publisher,
                    b.total_copies, b.available_copies
                FROM books b
                LEFT JOIN categories c ON b.category_id = c.category_id
            """)
            
            books = cursor.fetchall()
            
            if not books:
                logger.warning("No books found in database")
                return 0
            
            # Convert books to text chunks for embedding
            texts = []
            metadatas = []
            
            for book in books:
                # Create rich text description
                text = f"""Book: {book['title']}
Author: {book['author']}
Category: {book.get('category_name', 'Uncategorized')}
ISBN: {book.get('isbn', 'N/A')}
Publisher: {book.get('publisher', 'Unknown')}
Available Copies: {book['available_copies']} of {book['total_copies']}"""
                
                texts.append(text)
                metadatas.append({
                    'source': 'library_catalog',
                    'type': 'book',
                    'book_id': str(book['book_id']),
                    'title': book['title'],
                    'author': book['author'],
                    'category': book.get('category_name', 'Uncategorized'),
                    'available': book['available_copies'] > 0,
                    'ingested_at': datetime.now().isoformat()
                })
            
            # Add to vector store
            self.vector_store.add_texts(texts=texts, metadatas=metadatas)
            
            logger.info(f"✅ Ingested {len(books)} books into vector store")
            return len(books)
            
        finally:
            cursor.close()
            conn.close()
    
    def ingest_subjects(self) -> int:
        """
        Ingest subjects/courses into vector store.
        Returns count of subjects ingested.
        """
        logger.info("Starting subjects ingestion...")
        
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute("""
                SELECT 
                    subject_id, subject_code, subject_name,
                    credits, semester, branch_code, min_attendance_percent
                FROM subjects
            """)
            
            subjects = cursor.fetchall()
            
            if not subjects:
                logger.warning("No subjects found in database")
                return 0
            
            texts = []
            metadatas = []
            
            for subj in subjects:
                text = f"""Subject: {subj['subject_code']} - {subj['subject_name']}
Branch: {subj.get('branch_code', 'ALL')}
Credits: {subj.get('credits', 'N/A')}
Semester: {subj.get('semester', 'N/A')}
Minimum Attendance Required: {subj.get('min_attendance_percent', 75)}%"""
                
                texts.append(text)
                metadatas.append({
                    'source': 'subjects',
                    'type': 'subject',
                    'subject_id': str(subj['subject_id']),
                    'subject_code': subj['subject_code'],
                    'branch': subj.get('branch_code', 'ALL'),
                    'semester': str(subj.get('semester', '')),
                    'ingested_at': datetime.now().isoformat()
                })
            
            self.vector_store.add_texts(texts=texts, metadatas=metadatas)
            
            logger.info(f"✅ Ingested {len(subjects)} subjects into vector store")
            return len(subjects)
            
        finally:
            cursor.close()
            conn.close()
    
    def ingest_notices(self) -> int:
        """
        Ingest campus notices/announcements into vector store.
        Returns count of notices ingested.
        """
        logger.info("Starting notices ingestion...")
        
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute("""
                SELECT 
                    notice_id, title, content, priority,
                    target_audience, created_at
                FROM notices
                WHERE is_published = TRUE
                ORDER BY created_at DESC
                LIMIT 100
            """)
            
            notices = cursor.fetchall()
            
            if not notices:
                logger.warning("No notices found in database")
                return 0
            
            texts = []
            metadatas = []
            
            for notice in notices:
                text = f"""Notice: {notice['title']}
Priority: {notice.get('priority', 'MEDIUM')}
Target Audience: {notice.get('target_audience', 'ALL')}
Content: {notice['content']}
Date: {notice.get('created_at', 'N/A')}"""
                
                texts.append(text)
                metadatas.append({
                    'source': 'notices',
                    'type': 'notice',
                    'notice_id': str(notice['notice_id']),
                    'priority': notice.get('priority', 'MEDIUM'),
                    'target': notice.get('target_audience', 'ALL'),
                    'ingested_at': datetime.now().isoformat()
                })
            
            self.vector_store.add_texts(texts=texts, metadatas=metadatas)
            
            logger.info(f"✅ Ingested {len(notices)} notices into vector store")
            return len(notices)
            
        finally:
            cursor.close()
            conn.close()
    
    def ingest_categories(self) -> int:
        """
        Ingest book categories into vector store.
        Returns count of categories ingested.
        """
        logger.info("Starting book categories ingestion...")
        
        conn = self._get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute("""
                SELECT category_id, name, description
                FROM categories
            """)
            
            categories = cursor.fetchall()
            
            if not categories:
                logger.warning("No categories found")
                return 0
            
            texts = []
            metadatas = []
            
            for cat in categories:
                text = f"""Book Category: {cat['name']}
Description: {cat.get('description', 'General category')}"""
                
                texts.append(text)
                metadatas.append({
                    'source': 'categories',
                    'type': 'book_category',
                    'category_id': str(cat['category_id']),
                    'name': cat['name'],
                    'ingested_at': datetime.now().isoformat()
                })
            
            self.vector_store.add_texts(texts=texts, metadatas=metadatas)
            
            logger.info(f"✅ Ingested {len(categories)} categories into vector store")
            return len(categories)
            
        finally:
            cursor.close()
            conn.close()
    
    def ingest_all(self) -> Dict[str, int]:
        """
        Ingest all data sources.
        Returns dict with counts for each source.
        """
        results = {}
        
        try:
            results['books'] = self.ingest_library_catalog()
        except Exception as e:
            logger.error(f"Failed to ingest library catalog: {e}")
            results['books'] = 0
        
        try:
            results['subjects'] = self.ingest_subjects()
        except Exception as e:
            logger.error(f"Failed to ingest subjects: {e}")
            results['subjects'] = 0
        
        try:
            results['notices'] = self.ingest_notices()
        except Exception as e:
            logger.error(f"Failed to ingest notices: {e}")
            results['notices'] = 0
        
        try:
            results['categories'] = self.ingest_categories()
        except Exception as e:
            logger.error(f"Failed to ingest categories: {e}")
            results['categories'] = 0
        
        total = sum(results.values())
        logger.info(f"🔥 TOTAL INGESTED: {total} items")
        logger.info(f"   - Books: {results['books']}")
        logger.info(f"   - Subjects: {results['subjects']}")
        logger.info(f"   - Notices: {results['notices']}")
        logger.info(f"   - Categories: {results['categories']}")
        
        return results


def main():
    """
    CLI entry point for database ingestion.
    """
    # Database connection config
    # TODO: Move to environment variables or config file
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '',  # Set your MySQL password
        'database': 'campus_intelligence'  # Or 'connect_college'
    }
    
    ingestor = DatabaseIngestor(db_config)
    results = ingestor.ingest_all()
    
    print("\n" + "="*50)
    print("🚀 RAG DATABASE INGESTION COMPLETE!")
    print("="*50)
    print(f"Books ingested: {results['books']}")
    print(f"Courses ingested: {results['courses']}")
    print(f"Total items: {sum(results.values())}")
    print("="*50)


if __name__ == "__main__":
    main()
