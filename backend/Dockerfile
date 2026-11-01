FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN SECRET_KEY=x python manage.py collectstatic --noinput
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi -b 0.0.0.0:8000 -w 3 --timeout 60"]
