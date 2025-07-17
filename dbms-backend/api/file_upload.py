import os
import uuid

import aiofiles
from fastapi import HTTPException, UploadFile

UPLOAD_DIR = "uploads/products"
PROFILE_UPLOAD_DIR = "uploads/profiles"


async def save_uploaded_file(file: UploadFile) -> str:
    """
    Save an uploaded file and return its relative path
    """
    try:
        # Create upload directory if it doesn't exist
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Save the file
        content = await file.read()
        async with aiofiles.open(file_path, "wb") as out_file:
            await out_file.write(content)

        # Return the relative path that can be used in URLs
        return f"/uploads/products/{unique_filename}"

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}") from e


async def save_profile_image(file: UploadFile, user_id: int) -> str:
    """
    Save a user profile image and return its relative path
    """
    try:
        # Create upload directory if it doesn't exist
        os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)

        # Generate filename with user id
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"profile_{user_id}_{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(PROFILE_UPLOAD_DIR, filename)

        # Save the file
        content = await file.read()
        async with aiofiles.open(file_path, "wb") as out_file:
            await out_file.write(content)

        # Return the relative path that can be used in URLs
        return f"/uploads/profiles/{filename}"

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error saving profile image: {str(e)}"
        ) from e


def get_full_path(relative_path: str) -> str:
    """
    Get the full filesystem path for a given relative path
    """
    return os.path.join(os.getcwd(), relative_path.lstrip("/"))


def delete_file(relative_path: str) -> bool:
    """
    Delete a file given its relative path
    """
    try:
        full_path = get_full_path(relative_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False
    except Exception:
        return False

