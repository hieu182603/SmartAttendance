#!/usr/bin/env python3
"""
Entry point to run Face Recognition API server
"""
import uvicorn
from dotenv import load_dotenv
from app.utils.config import HOST, PORT

# Load environment variables from .env file
load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=True,  # Auto-reload on code changes (dev mode)
        log_level="info"
    )






