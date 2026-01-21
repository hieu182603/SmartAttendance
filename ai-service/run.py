#!/usr/bin/env python3
"""
Entry point to run Face Recognition API server
"""
import uvicorn
import os
from app.utils.config import HOST, PORT, LOG_LEVEL

if __name__ == "__main__":
    # Enable reload only in development mode
    reload_enabled = os.getenv("DEV_MODE", "false").lower() == "true"

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=reload_enabled,
        log_level=LOG_LEVEL.lower()
    )






