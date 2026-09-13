import os
from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "harness",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    # Picks up any campaign whose scheduled_at has arrived and dispatches it.
    # Runs every minute so scheduled campaigns go out close to their target time.
    "dispatch-due-campaigns": {
        "task": "app.tasks.dispatch_due_campaigns",
        "schedule": crontab(minute="*"),
    },
}
