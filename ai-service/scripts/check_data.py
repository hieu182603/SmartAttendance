from pymongo import MongoClient

uri = 'mongodb+srv://huymthe187068_db_user:OXY0idNb7IgI5WHV@cluster0.prickit.mongodb.net/smartattendance'
client = MongoClient(uri)
db = client.get_database()

count = db.get_collection('rag_documents').count_documents({})
print('Collection rag_documents:', count, 'documents')

docs = db.get_collection('rag_documents').find().limit(3)
for doc in docs:
    title = doc.get('metadata', {}).get('title', 'N/A')
    print('- Title:', title)
    print('  Has embedding:', 'embedding' in doc)

