"""
COMPLETE DATABASE INGESTION WITH FAISS
No module caching issues - fresh execution
"""

import sys
import logging

# Ensure clean imports
if 'database_ingestor' in sys.modules:
    del sys.modules['database_ingestor']
if 'memory.vector.chroma' in sys.modules:
    del sys.modules['memory.vector.chroma']

logging.basicConfig(level=logging.INFO)

from ingestion.database_ingestor import DatabaseIngestor

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'aditya',
    'database': 'connect_college'
}

print("\n" + "="*70)
print("🔥 MONSTER RAG - FULL DATABASE INGESTION WITH FAISS")
print("="*70)
print(f"\nDatabase: {DB_CONFIG['database']}")
print(f"Vector Store: FAISS (No corruption issues!)\n")

try:
    ingestor = DatabaseIngestor(DB_CONFIG)
    results = ingestor.ingest_all()
    
    print("\n" + "="*70)
    print("✅ INGESTION COMPLETE!")
    print("="*70)
    print(f"📚 Books: {results.get('books', 0)}")
    print(f"🎓 Subjects: {results.get('subjects', 0)}")
    print(f"📢 Notices: {results.get('notices', 0)}")
    print(f"📁 Categories: {results.get('categories', 0)}")
    print(f"📊 TOTAL: {sum(results.values())} items")
    print("="*70)
    print("\n🚀 RAG IS NOW A MONSTER!")
    print("\nTest queries in AI chat:")
    print('  - "Find me books on Machine Learning"')
    print('  - "What subjects are in CSE department?"')
    print('  - "Tell me about subject CS301"')
    print("="*70 + "\n")
    
except Exception as e:
    print(f"\n❌ Ingestion failed: {e}")
    import traceback
    traceback.print_exc()
