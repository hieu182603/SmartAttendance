@echo off
REM Setup script for AI Service development environment (Windows)

echo 🚀 Setting up AI Service development environment...

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment and install dependencies
echo 🔧 Installing dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

echo 🎉 Setup complete!
echo To activate the environment, run: venv\Scripts\activate.bat
echo To run the service, use: python run.py
pause
