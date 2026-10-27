FROM python:3.11-slim

# Install system utilities and ffmpeg for video decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Generate sample forensic assets
RUN python create_samples.py

# Cloud platform compatibility (Render, Railway, Hugging Face Spaces port 8000/7860)
EXPOSE 8000
ENV PORT=8000
ENV HOST=0.0.0.0

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
