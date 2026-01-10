"""
Quick script to ingest campus data into RAG vector store.
Run this after Agent1 starts to populate ChromaDB with database content.
"""

from ingestion.database_ingestor import DatabaseIngestor
import sys

# Database configuration
# UPDATE THESE VALUES FOR YOUR SETUP
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'aditya',  # YOUR MYSQL PASSWORD HERE
    'database': 'connect_college'  # Correct database name
}

def main():
    print("\n" + "="*60)
    print("🔥 MONSTER RAG - DATABASE INGESTION")
    print("="*60)
    print(f"\nConnecting to database: {DB_CONFIG['database']}")
    print(f"Host: {DB_CONFIG['host']}\n")
    
    try:
        ingestor = DatabaseIngestor(DB_CONFIG)
        results = ingestor.ingest_all()
        
        print("\n" + "="*60)
        print("✅ INGESTION SUCCESSFUL!")
        print("="*60)
        print(f"📚 Books ingested: {results.get('books', 0)}")
        print(f"🎓 Subjects ingested: {results.get('subjects', 0)}")
        print(f"📢 Notices ingested: {results.get('notices', 0)}")
        print(f"📁 Categories ingested: {results.get('categories', 0)}")
        print(f"📊 Total items: {sum(results.values())}")
        print("="*60)
        print("\n🚀 RAG is now a MONSTER with campus data!")
        print("Test queries:")
        print('  - "Find me books on Machine Learning"')
        print('  - "What subjects are available in CSE department?"')
        print('  - "Show me recent notices"')
        print('  - "Tell me about subject CS301"')
        print("="*60 + "\n")
        
        return 0
        
    except Exception as e:
        print("\n" + "="*60)
        print("❌ INGESTION FAILED")
        print("="*60)
        print(f"Error: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check database credentials in DB_CONFIG")
        print("2. Ensure MySQL server is running")
        print("3. Verify database name is correct")
        print("4. Check that tables 'books' and 'courses' exist")
        print("="*60 + "\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
