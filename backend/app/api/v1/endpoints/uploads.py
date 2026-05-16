from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models import SubmissionFile
from app.schemas.submissions import SubmissionFileResponse
from app.services.crud import CRUDService
from app.services.storage import AzureBlobStorageService

router = APIRouter()


@router.post("/submission/{submission_id}", response_model=SubmissionFileResponse)
async def upload_submission_file(
    submission_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    service = AzureBlobStorageService()
    if not service.enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Azure storage is not configured")

    uploaded = await service.upload(f"submissions/{submission_id}", file)
    record = CRUDService(db, SubmissionFile).create(
        {
            "submission_id": submission_id,
            "uploaded_by_id": user.id,
            "file_name": file.filename,
            "blob_name": uploaded["blob_name"],
            "content_type": file.content_type or "application/octet-stream",
            "size_bytes": uploaded["size_bytes"],
            "file_url": uploaded["file_url"],
        }
    )
    return record

