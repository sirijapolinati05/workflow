import enum
import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel, Base, TimestampMixin, UUIDMixin


class RoleName(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    TEAM_LEAD = "TEAM_LEAD"
    EMPLOYEE = "EMPLOYEE"


class PresenceStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    IDLE = "IDLE"
    OFFLINE = "OFFLINE"


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Role(BaseModel):
    __tablename__ = "roles"

    name: Mapped[RoleName] = mapped_column(Enum(RoleName, name="role_name"), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(BaseModel):
    __tablename__ = "users"

    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    job_title: Mapped[str | None] = mapped_column(String(120))
    phone_number: Mapped[str | None] = mapped_column(String(40))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    signature: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    role: Mapped["Role"] = relationship(back_populates="users")
    profile: Mapped["EmployeeProfile | None"] = relationship(
        back_populates="user",
        uselist=False,
        foreign_keys="EmployeeProfile.user_id",
    )


class EmployeeProfile(BaseModel):
    __tablename__ = "employee_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    employee_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    department: Mapped[str | None] = mapped_column(String(100))
    manager_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    hire_date: Mapped[date | None] = mapped_column(Date)
    timezone: Mapped[str | None] = mapped_column(String(64))
    location: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[PresenceStatus] = mapped_column(Enum(PresenceStatus, name="presence_status"), default=PresenceStatus.ACTIVE)
    bio: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(
        back_populates="profile",
        foreign_keys=[user_id],
    )


class Group(BaseModel):
    __tablename__ = "groups"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    members: Mapped[list["GroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class GroupMember(UUIDMixin, Base):
    __tablename__ = "group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_member"),)

    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    group: Mapped["Group"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()


class Task(BaseModel):
    __tablename__ = "tasks"

    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus, name="task_status"), default=TaskStatus.PENDING, index=True)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, name="task_priority"), default=TaskPriority.MEDIUM, nullable=False
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    group_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("groups.id"))
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_hours: Mapped[int | None] = mapped_column(Integer)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)


class TaskUpdate(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "task_updates"

    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TaskStatus | None] = mapped_column(Enum(TaskStatus, name="task_status"))


class Submission(BaseModel):
    __tablename__ = "submissions"

    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tasks.id"))
    submitted_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority, name="task_priority"), default=TaskPriority.MEDIUM)
    deployment_link: Mapped[str | None] = mapped_column(String(500))
    github_pr_link: Mapped[str | None] = mapped_column(String(500))
    duration: Mapped[str | None] = mapped_column(String(100))
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="SUBMITTED", nullable=False)
    feedback: Mapped[str | None] = mapped_column(Text)
    links: Mapped[list | None] = mapped_column(JSON)
    files: Mapped[list["SubmissionFile"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class SubmissionFile(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "submission_files"

    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    file_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    is_feedback: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    submission: Mapped["Submission"] = relationship(back_populates="files")





class Notification(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class InternalMail(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "internal_mails"

    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    recipient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_starred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_attachments: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    folder: Mapped[str] = mapped_column(String(50), default="inbox", nullable=False)

    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id])

class Message(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "messages"

    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    recipient_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    group_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("groups.id"))
    thread_id: Mapped[str | None] = mapped_column(String(80))
    body: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(20), default="text", nullable=False)
    content_metadata: Mapped[dict | None] = mapped_column(JSON)
    attachment_url: Mapped[str | None] = mapped_column(Text)
    reply_to_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("messages.id"))
    reactions: Mapped[dict | None] = mapped_column(JSON, default=dict)

    @property
    def sender_name(self) -> str | None:
        if self.sender:
            return self.sender.full_name
        return None

    @property
    def sender_avatar(self) -> str | None:
        if self.sender:
            return self.sender.profile_picture
        return None

    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    reply_to: Mapped["Message | None"] = relationship("Message", remote_side="Message.id", foreign_keys=[reply_to_id])

class AttendanceLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "attendance_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    check_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(30), default="PRESENT", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

class LeaveRequest(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "leave_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))


class Report(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "reports"

    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    filters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class AuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    details: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
