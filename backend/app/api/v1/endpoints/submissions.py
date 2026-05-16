import json
from typing import List
from fastapi import APIRouter, Depends, Query, BackgroundTasks, File, UploadFile, Form, Response, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database.session import get_db
from app.models import RoleName, Submission, User, TaskPriority, Role, SubmissionFile
from app.schemas.common import PaginatedResponse
from app.schemas.submissions import SubmissionCreateRequest, SubmissionResponse
from app.services.crud import CRUDService
from app.services.notifications import NotificationService
from app.services.storage import AzureBlobStorageService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[SubmissionResponse])
def list_submissions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    query = db.query(Submission).options(selectinload(Submission.files))
    
    # If employee, only show their own submissions
    if current_user.role.name == RoleName.EMPLOYEE:
        query = query.filter(Submission.submitted_by_id == current_user.id)
    
    query = query.order_by(Submission.created_at.desc())
    
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=SubmissionResponse)
async def create_submission(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD, RoleName.EMPLOYEE)),
    task_id: str | None = Form(None),
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    priority: str = Form("MEDIUM"),
    deployment_link: str | None = Form(None),
    github_pr_link: str | None = Form(None),
    duration: str | None = Form(None),
    links: str | None = Form(None),
    files: List[UploadFile] | None = File(default=None),
):
    print(f"=== RECEIVED SUBMISSION ===")
    print(f"User: {current_user.email}")
    print(f"Title: {title}")
    print(f"Files received: {len(files) if files else 0}")
    
    with open("upload_debug.txt", "a") as f:
        f.write(f"Received submission: {title}\n")
        f.write(f"Files length: {len(files) if files else 0}\n")
        if files:
            for i, fl in enumerate(files):
                f.write(f"  File {i}: {fl.filename} ({fl.content_type})\n")
    
    # Parse links if provided
    parsed_links = []
    if links:
        try:
            parsed_links = json.loads(links)
        except:
            parsed_links = []

    data = {
        "task_id": task_id if task_id and task_id != "null" else None,
        "title": title,
        "description": description,
        "category": category,
        "priority": TaskPriority(priority),
        "deployment_link": deployment_link,
        "github_pr_link": github_pr_link,
        "duration": duration,
        "links": parsed_links,
        "submitted_by_id": current_user.id
    }
    
    submission = CRUDService(db, Submission).create(data)
    
    # Handle File Uploads
    if files:
        for file in files:
            try:
                print(f"Reading file: {file.filename}")
                content = await file.read()
                print(f"File size read: {len(content)}")
                
                submission_file = SubmissionFile(
                    submission_id=submission.id,
                    uploaded_by_id=current_user.id,
                    file_name=file.filename,
                    content_type=file.content_type,
                    size_bytes=len(content),
                    file_data=content
                )
                db.add(submission_file)
                print(f"Added to DB session: {file.filename}")
            except Exception as e:
                import traceback
                print(f"File upload error for {file.filename}: {e}")
                traceback.print_exc()
        try:
            db.commit()
            db.refresh(submission)
            print("Successfully committed submission files")
        except Exception as e:
            print(f"Commit error: {e}")
            db.rollback()
    
    # Notify all Admins/SuperAdmins
    try:
        admins = db.query(User).join(Role, User.role_id == Role.id).filter(Role.name == RoleName.ADMIN).all()
        super_admins = db.query(User).join(Role, User.role_id == Role.id).filter(Role.name == RoleName.SUPER_ADMIN).all()
        all_notifiable_admins = admins + super_admins
        
        for admin in all_notifiable_admins:
            background_tasks.add_task(
                NotificationService.create_notification,
                db,
                str(admin.id),
                "New Submission",
                f"Employee {current_user.full_name} has submitted work for: {submission.title}",
                "SUBMISSION_RECEIVED",
                {"submission_id": str(submission.id)}
            )
    except Exception as e:
        print(f"Notification error: {e}")
        
    return submission


@router.post("/{submission_id}/feedback", response_model=SubmissionResponse)
async def add_submission_feedback(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    feedback: str = Form(...),
    files: List[UploadFile] | None = File(default=None),
):
    service = CRUDService(db, Submission)
    submission = service.get(submission_id)
    
    # Only Admin, Super Admin or Team Lead can give feedback
    if current_user.role.name not in [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD]:
        raise HTTPException(status_code=403, detail="Not authorized to give feedback")
        
    submission.feedback = feedback
    
    if files:
        for file in files:
            try:
                content = await file.read()
                submission_file = SubmissionFile(
                    submission_id=submission.id,
                    uploaded_by_id=current_user.id,
                    file_name=file.filename,
                    content_type=file.content_type,
                    size_bytes=len(content),
                    file_data=content,
                    is_feedback=True
                )
                db.add(submission_file)
            except Exception as e:
                print(f"Feedback file upload error: {e}")
                
    db.commit()
    db.refresh(submission)
    
    # Notify employee
    from app.services.notifications import NotificationService
    await NotificationService.create_notification(
        db,
        str(submission.submitted_by_id),
        "New Feedback Received",
        f"Admin {current_user.full_name} has provided feedback on your submission: {submission.title}",
        "SUBMISSION_UPDATED",
        {"submission_id": str(submission.id)}
    )
    
    return submission

@router.patch("/{submission_id}", response_model=SubmissionResponse)
def update_submission(
    submission_id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CRUDService(db, Submission)
    submission = service.get(submission_id)
    
    if current_user.role.name == RoleName.EMPLOYEE:
        if submission.submitted_by_id != current_user.id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Not authorized to edit this submission")
    
    old_status = submission.status
    updated_submission = service.update(submission_id, payload)
    
    # Notify employee if status changed
    if "status" in payload and payload["status"] != old_status:
        background_tasks.add_task(
            NotificationService.create_notification,
            db,
            str(updated_submission.submitted_by_id),
            "Submission Update",
            f"Your submission '{updated_submission.title}' has been {updated_submission.status}",
            "SUBMISSION_UPDATED",
            {"submission_id": str(updated_submission.id), "status": updated_submission.status}
        )
            
    return updated_submission


@router.delete("/{submission_id}")
def delete_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CRUDService(db, Submission)
    submission = service.get(submission_id)
    
    if current_user.role.name == RoleName.EMPLOYEE:
        if submission.submitted_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this submission")
            
    service.delete(submission_id)
    return True

@router.get("/files/{file_id}")
def get_submission_file(
    file_id: str,
    db: Session = Depends(get_db)
):
    file_record = db.query(SubmissionFile).filter(SubmissionFile.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
        
    return Response(content=file_record.file_data, media_type=file_record.content_type)
