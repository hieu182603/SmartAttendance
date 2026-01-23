#!/bin/bash
# Setup script for AI Service development environment

echo "🚀 Setting up AI Service development environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment and install dependencies
echo "🔧 Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "🎉 Setup complete!"
echo "To activate the environment, run: source venv/bin/activate"
echo "To run the service, use: python run.py"
