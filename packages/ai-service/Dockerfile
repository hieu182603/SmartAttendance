# Multi-stage build for optimized image size
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install CPU-only PyTorch and torchvision first to avoid heavy GPU/CUDA dependencies (saving ~8GB image size)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgomp1 \
    libxcb1 \
    libx11-6 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy only necessary application files
COPY app/ ./app/
COPY run.py .
COPY mongodb_vector_index.json .

# Create models directory (mounted as volume in Fly.io)
RUN mkdir -p /app/models

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app

USER app

# The service listens on PORT (default 8001 — see app/utils/config.py and docker-compose.yml).
EXPOSE 8001

# Health check (basic TCP connection test on the actual service port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, socket; s=socket.socket(); s.connect(('localhost', int(os.getenv('PORT', '8001')))); s.close()" || exit 1

# Use exec form for better signal handling
CMD ["python", "run.py"]
