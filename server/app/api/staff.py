# CRUD staff
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Depends
from fastapi import status as http_status
from typing import Optional
from datetime import datetime, timezone
from app.database import SessionDep
from app.model import Staff
from app.crud import create_data, update_data, delete_data, get_admin_data, get_single_data
from app.auth.authentication import AuthUser, MIN_PASSWORD_LENGTH, hash_password, require_admin, require_staff
from app.services.upload import handle_file_upload
from sqlalchemy import update as sql_update
from sqlmodel import select


router = APIRouter(prefix="/staff", tags=["staff"])

# never sent to any client
_SECRET_FIELDS = {"password", "prev_password", "jwt_token"}


def _public(staff) -> dict:
    return staff.model_dump(exclude=_SECRET_FIELDS)


def _clean_role(role: Optional[str]) -> Optional[str]:
    """Job role, normalised.  "admin" is reserved for the Admin table."""
    if role is None:
        return None
    role = role.strip().lower()
    if role == "admin":
        raise HTTPException(status_code=400, detail='"admin" is not a valid staff role')
    return role or None


def _check_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )

@router.post('/create_staff')
async def create_staff(
    session: SessionDep,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    bio: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    cv: Optional[UploadFile] = File(None),
    auth: AuthUser = Depends(require_admin)
):
    
    role = _clean_role(role)
    _check_password(password)

    try:
        hashed_password = hash_password(password)
        # Handle file uploads
        image_url = None
        if image:
            image_url = await handle_file_upload(image)

        cv_url = None
        if cv:
            cv_url = await handle_file_upload(cv )

        # Prepare data for database
        staff_dict = {
            "admin_id": auth.get("admin_id"),
            "name": name,
            "email": email,
            "password": hashed_password,
            "prev_password": hashed_password, 
            "bio": bio,
            "role": role,
            "image_url": image_url,
            "cv_url": cv_url,
            "created_at": datetime.now(timezone.utc)
        }

        success, staff = create_data("staff", staff_dict, session)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create staff"
            )

        return {"message": "Staff created successfully", "staff": _public(staff)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating staff: {str(e)}"
        )


@router.get("/get_staff")
def read_staff(
    session: SessionDep,
    auth: AuthUser = Depends(require_admin)
):

    try:
        staff_list = get_admin_data(auth["admin_id"], "staff", session)

        if not staff_list:
            return {"message": "No staff found", "staff": []}

        return staff_list
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving staff: {str(e)}"
        )


# @router.get("/{staff_id}")
# def get_single_staff(
#     session: SessionDep,
#     staff_id: int,
# ):

#     try:
#         staff = get_single_data(staff_id, "staff", session)

#         if not staff:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Staff not found"
#             )

#         return {"message": "Staff retrieved successfully", "staff": staff}
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error retrieving staff: {str(e)}"
#         )


@router.put('/update_staff/{staff_id}')
async def update_staff(
    session: SessionDep,
    staff_id: int,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    cv: Optional[UploadFile] = File(None),
    auth: AuthUser = Depends(require_admin)
):

    try:
        # Get existing staff
        existing_staff = get_single_data(staff_id, "staff", session)
        if not existing_staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff not found"
            )

        # Verify admin owns this staff
        if existing_staff.admin_id != auth.get("admin_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this staff"
            )

        # Prepare update dict (only include fields that are provided)
        staff_dict = {}

        role = _clean_role(role)
        if name is not None:
            staff_dict["name"] = name
        if email is not None:
            staff_dict["email"] = email
        if password is not None:
            _check_password(password)
            hashed_password = hash_password(password)
            staff_dict["password"] = hashed_password
            staff_dict["prev_password"] = password
          
        if bio is not None:
            staff_dict["bio"] = bio
        if role is not None:
            staff_dict["role"] = role  # read from the DB on every request, no re-login needed

        # Handle file uploads if new files provided
        if image:
            image_url = await handle_file_upload(image)
            staff_dict["image_url"] = image_url

        if cv:
            cv_url = await handle_file_upload(cv)
            staff_dict["cv_url"] = cv_url

        # Update staff using CRUD function
        success, updated_staff = update_data("staff", staff_id, staff_dict, session)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update staff"
            )

        result = _public(updated_staff)
        if password is not None:
            # password changed: sign the staff member out of any existing session
            session.exec(sql_update(Staff).where(Staff.id == staff_id).values(jwt_token=None))
            session.commit()

        return {"message": "Staff updated successfully", "staff": result}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating staff: {str(e)}"
        )


@router.delete('/delete_staff/{staff_id}')
def delete_staff(
    session: SessionDep,
    staff_id: int,
    auth: AuthUser = Depends(require_admin)
):

    try:
        # Get existing staff
        existing_staff = get_single_data(staff_id, "staff", session)
        if not existing_staff:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Staff not found"
            )

        # Verify admin owns this staff
        if existing_staff.admin_id != auth.get("admin_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this staff"
            )

        # Delete staff using CRUD function
        success = delete_data("staff", staff_id, session)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete staff"
            )

        return {"message": "Staff deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting staff: {str(e)}"
        )
        
@router.get('/profile')
def staff_profile(
    session: SessionDep,
    auth: AuthUser = Depends(require_staff),
):
    staff = get_single_data(auth["staff_id"], "staff", session)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return _public(staff)
