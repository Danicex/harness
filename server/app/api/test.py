import os
from typing import Dict, Any, List
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import SQLModel, Session, create_engine
from openai import OpenAI

# Initialize FastAPI App and OpenAI Client
app = FastAPI(title="Hotel Receptionist API")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Mock Database Engine for SQLModel Session injection
engine = create_engine("sqlite:///:memory:")

def get_session():
    with Session(engine) as session:
        yield session

# ==========================================
# PLACEHOLDER HELPER FUNCTIONS (As Required)
# ==========================================
def get_admin_data(model_name: str, admin_id: int, session: Session) -> List[Any]:
    # Mock retrieval logic based on model_name
    return []

def create_data(model_name: str, admin_id: int, session: Session, data: dict) -> Any:
    return {"status": "created", "model": model_name}

def update_data(model_name: str, admin_id: int, object_id: int, session: Session, data: dict) -> Any:
    return {"status": "updated", "model": model_name, "id": object_id}

def delete_data(model_name: str, admin_id: int, session: Session, object_id: int) -> Any:
    return {"status": "deleted", "model": model_name, "id": object_id}


# ==========================================
# CORE IMPLEMENTATION
# ==========================================

def get_dataset(admin_id: int, session: Session) -> Dict[str, Any]:
    # Fetch datasets using requested helper signatures
    room_data = get_admin_data("room_data", admin_id, session)
    hotel_information = get_admin_data("hotel_information", admin_id, session)
    
    data_set = {
        "rooms": room_data,
        "hotel_info": hotel_information
    }
    return data_set


class payload(BaseModel):
    admin_id: int
    user_input: str


def process_response(user_input: str, context_dataset: Dict[str, Any]) -> str:
    """Uses GPT to act as a hotel receptionist using the provided dataset context."""
    system_prompt = (
        "You are an AI Hotel Receptionist. Be polite, professional, and helpful. "
        "Use the following hotel dataset context to accurately answer guest inquiries. "
        "If you do not know the answer based on the context, politely ask them to wait "
        "while you check with human management.\n\n"
        f"Hotel Context Data:\n{context_dataset}"
    )
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            temperature=0.5
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Hello! I'm having trouble retrieving system details right now. Error: {str(e)}"


@app.post("/chat", status_code=status.HTTP_200_OK)
def respond_chat(payload_data: payload, session: Session = Depends(get_session)):
    """API Endpoint acting as a receptionist powered by admin hotel datasets."""
    # 1. Fetch relevant background datasets for this specific administrator
    context_dataset = get_dataset(payload_data.admin_id, session)
    
    # 2. Process customer request via GPT receptionist
    ai_reply = process_response(payload_data.user_input, context_dataset)
    
    return {
        "status": "success",
        "reply": ai_reply
    }


# ==========================================
# DATASET MANAGEMENT API ENDPOINTS
# ==========================================

@app.post("/dataset/{model_name}")
def add_dataset(model_name: str, admin_id: int, data: dict, session: Session = Depends(get_session)):
    """Creates a new record entry for the specified data model."""
    result = create_data(model_name, admin_id, session, data)
    return {"message": f"Successfully added data to {model_name}", "result": result}


@app.put("/dataset/{model_name}/{object_id}")
def update_dataset(model_name: str, admin_id: int, object_id: int, data: dict, session: Session = Depends(get_session)):
    """Updates an existing record entry matching the data model and structural ID."""
    result = update_data(model_name, admin_id, object_id, session, data)
    return {"message": f"Successfully updated data in {model_name}", "result": result}


@app.delete("/dataset/{model_name}/{object_id}")
def delete_dataset(model_name: str, admin_id: int, object_id: int, session: Session = Depends(get_session)):
    """Removes a record from the database structure using the delete helper."""
    # Adjusted signature to accept structural object dependency tracking
    result = delete_data(model_name, admin_id, session, object_id)
    return {"message": f"Successfully deleted data from {model_name}", "result": result}
