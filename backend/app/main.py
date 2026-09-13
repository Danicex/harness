from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import create_db_and_tables
from app.auth import authentication, subscription
from app.api import product, sales, campaign, staff, rooms, booking, hotel_profile, customer, chatbot, blog, inbox, analytics, call_log, task_api, dataset
import os

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)
app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:8080",
]

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "harness"}

@app.on_event("startup")
async def startup_event():
    create_db_and_tables()

app.include_router(authentication.router)
app.include_router(subscription.router)

# inventory
app.include_router(product.router)
app.include_router(sales.router)

# campaigns
app.include_router(campaign.router)

# staff: check-in/out, shifts, tasks, notifications
app.include_router(staff.router)

# hotel data + booking + AI receptionist
app.include_router(hotel_profile.router)
app.include_router(rooms.router)
app.include_router(booking.router)
app.include_router(customer.router)
app.include_router(chatbot.router)
app.include_router(blog.router)
app.include_router(analytics.router)
app.include_router(inbox.router)
app.include_router(dataset.router)
app.include_router(call_log.router)
app.include_router(task_api.router)