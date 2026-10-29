import os
from celery import Celery
from celery.schedules import crontab


REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "hotel",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['app.task.tasks']  
)
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    enable_utc=True,
)

celery_app.conf.timezone = "UTC"

celery_app.conf.beat_schedule = {
    "update-room-status-every-day": {
        "task": "app.tasks.update_room_statuses",
        "schedule": crontab(hour=0, minute=0),
    },
}




# Campaign scheduling (beat) goes here later, e.g.:
# celery_app.conf.beat_schedule = {...}