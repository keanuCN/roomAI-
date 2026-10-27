FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONUTF8=1 ASSETS_ROOT=/app/assets MEDIA_ROOT=/app/data/media
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY web/public/assets /app/assets
RUN useradd -m app && mkdir -p /app/data/media && chown -R app:app /app
USER app
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
