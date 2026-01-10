"""
Quick standalone test of FAISS ingestion
Run this directly without importing database_ingestor
"""

import logging
logging.basicConfig(level=logging.INFO)

# Direct FAISS test
from memory.vector.faiss_store import FAISSVectorStore

print("\n" + "="*60)
print("🧪 FAISS STANDALONE TEST")
print("="*60)

try:
    # Create vector store
    print("\n1. Creating FAISS vector store...")
    store = FAISSVectorStore(path="./test_vector_store")
    print("✅ FAISS store created successfully!")
    
    # Add test data
    print("\n2. Adding test data...")
    texts = [
        "Book: Machine Learning by Tom Mitchell. Category: Engineering. Available: 5 copies",
        "Subject: CS301 - Data Structures. Department: CSE. Credits: 4",
        "Book: Introduction to Algorithms. Category: Computer Science. Available: 3 copies"
    ]
    metadatas = [
        {"type": "book", "title": "Machine Learning"},
        {"type": "subject", "code": "CS301"},
        {"type": "book", "title": "Algorithms"}
    ]
    
    store.add_texts(texts, metadatas)
    print(f"✅ Added {len(texts)} items to FAISS!")
    
    # Test search
    print("\n3. Testing similarity search...")
    results = store.similarity_search("machine learning book", k=2)
    print(f"✅ Search returned {len(results)} results:")
    for i, result in enumerate(results, 1):
        print(f"   {i}. {result[:80]}...")
    
    print("\n" + "="*60)
    print("✅ FAISS WORKS PERFECTLY!")
    print("="*60)
    print("\nNow we can use it for real database ingestion!")
    print("="*60 + "\n")
    
except Exception as e:
    print(f"\n❌ FAISS test failed: {e}")
    import traceback
    traceback.print_exc()
