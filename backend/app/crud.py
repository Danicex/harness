# define crud function to dynamically perform crud
# import session and model
from app.database import SessionDep
from sqlmodel import select
from app.model import Customer, Campaign

# Use SessionDep as a dependency injection, not as a global variable
# Remove the global session assignment

obj_map = {
    "customer": Customer,
    "campaign": Campaign,
}

def read_user_data(obj_name: str, session: SessionDep, company_id: int, limit: int = 100):
    """
    Read multiple records with rate limit
    """
    model_class = obj_map.get(obj_name.lower())
    if not model_class:
        return None
    
    data = session.exec(
        select(model_class).limit(limit)
    ).all()
    return data

def create_data(obj_name: str, data_obj, session):
    """
    Create a new record
    """
    model_class = obj_map.get(obj_name.lower())
    if not model_class:
        return False, None
    
    # Create instance of the model with the validated data
    instance = model_class(**data_obj.dict() if hasattr(data_obj, 'dict') else data_obj)
    session.add(instance)
    session.commit()
    session.refresh(instance)
    return True, instance

def update_data(obj_name: str, obj_id: int, data_obj, session: SessionDep):
    """
    Update an existing record
    """
    model_class = obj_map.get(obj_name.lower())
    if not model_class:
        return False, None
    
    # Get existing record
    existing = session.exec(
        select(model_class).where(model_class.id == obj_id)
    ).first()
    
    if not existing:
        return False, None
    
    # Update fields
    update_data = data_obj.dict() if hasattr(data_obj, 'dict') else data_obj
    for key, value in update_data.items():
        if value is not None and hasattr(existing, key):
            setattr(existing, key, value)
    
    session.add(existing)
    session.commit()
    session.refresh(existing)
    return True, existing

def delete_data(obj_name: str, obj_id: int, session: SessionDep):
    """
    Delete a record
    """
    model_class = obj_map.get(obj_name.lower())
    if not model_class:
        return False
    
    # Get existing record
    existing = session.exec(
        select(model_class).where(model_class.id == obj_id)
    ).first()
    
    if not existing:
        return False
    
    session.delete(existing)
    session.commit()
    return True

def read_data(obj_name: str, session: SessionDep, limit: int = 100):
    """
    Read multiple records with rate limit
    """
    model_class = obj_map.get(obj_name.lower())
    if not model_class:
        return None
    
    data = session.exec(
        select(model_class).limit(limit)
    ).all()
    return data

def get_single_data(obj_id: int, obj_name: str, session: SessionDep):
    """
    Get a single record by ID
    """
    model_class = obj_map.get(obj_name.lower())
    if not model_class:
        return None
    
    data = session.exec(
        select(model_class).where(model_class.id == obj_id)
    ).first()
    return data
