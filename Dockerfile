# Multi-stage Dockerfile for Campus Collective Knowledge Graph & AI QA Engine
# Optimized for Google Cloud Run deployment

# Stage 1: Build React TypeScript Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, data, and graph builder
COPY backend/ ./backend/
COPY data/ ./data/
COPY build_graph.py ./
COPY knowledge.json ./

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Cloud Run sets PORT env var, defaults to 8080)
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
