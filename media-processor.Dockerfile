# apps/media-processor/Dockerfile
FROM python:3.11-slim-bookworm

# ─── Sistema + FFmpeg ──────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    tesseract-ocr \
    tesseract-ocr-por \
    tesseract-ocr-eng \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ─── Dependências Python ───────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "src.worker"]
