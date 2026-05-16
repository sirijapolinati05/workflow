from sqlalchemy import select
from app.core.security import get_password_hash
from app.database.session import SessionLocal, engine
from app.database.base import Base
from app.models import EmployeeProfile, Role, RoleName, User

QUICK_ACCESS_PASSWORD = "1234"

SEED_USERS = [
    {
        "email": "krishna@workflowpro.com",
        "full_name": "Krishna",
        "role": RoleName.ADMIN,
        "job_title": "Operations Admin",
        "employee_code": "WF-0001",
        "department": "Operations",
        "location": "HQ",
        "bio": "Platform administrator",
    },
    {
        "email": "aarav@workflowpro.com",
        "full_name": "Aarav",
        "role": RoleName.EMPLOYEE,
        "job_title": "Product Analyst",
        "employee_code": "WF-0002",
        "department": "Product",
        "location": "Hyderabad",
        "bio": "Employee workspace user",
    },
    {
        "email": "diyaa@workflowpro.com",
        "full_name": "Diyaa",
        "role": RoleName.EMPLOYEE,
        "job_title": "UI Designer",
        "employee_code": "WF-0003",
        "department": "Design",
        "location": "Bengaluru",
        "bio": "Employee workspace user",
    },
    {
        "email": "isha@workflowpro.com",
        "full_name": "Isha",
        "role": RoleName.EMPLOYEE,
        "job_title": "QA Engineer",
        "employee_code": "WF-0004",
        "department": "Quality",
        "location": "Chennai",
        "bio": "Employee workspace user",
    },
    {
        "email": "rithvik@workflowpro.com",
        "full_name": "Rithvik",
        "role": RoleName.EMPLOYEE,
        "job_title": "Backend Developer",
        "employee_code": "WF-0005",
        "department": "Engineering",
        "location": "Pune",
        "bio": "Employee workspace user",
    },
    {
        "email": "saanvi@workflowpro.com",
        "full_name": "Saanvi",
        "role": RoleName.EMPLOYEE,
        "job_title": "HR Coordinator",
        "employee_code": "WF-0006",
        "department": "Human Resources",
        "location": "Mumbai",
        "bio": "Employee workspace user",
    },
]


def seed() -> None:
    # Create tables first
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        for role_name in RoleName:
            existing = db.scalar(select(Role).where(Role.name == role_name))
            if not existing:
                db.add(Role(name=role_name, description=f"{role_name.value} role"))
        db.commit()

        for entry in SEED_USERS:
            user = db.scalar(select(User).where(User.email == entry["email"]))
            role = db.scalar(select(Role).where(Role.name == entry["role"]))
            if role is None:
                continue

            if not user:
                user = User(
                    role_id=role.id,
                    email=entry["email"],
                    password_hash=get_password_hash(QUICK_ACCESS_PASSWORD),
                    full_name=entry["full_name"],
                    job_title=entry["job_title"],
                )
                db.add(user)
                db.flush()
                db.add(
                    EmployeeProfile(
                        user_id=user.id,
                        employee_code=entry["employee_code"],
                        department=entry["department"],
                        timezone="Asia/Kolkata",
                        location=entry["location"],
                        bio=entry["bio"],
                    )
                )
                db.commit()
                continue

            user.role_id = role.id
            user.full_name = entry["full_name"]
            user.job_title = entry["job_title"]
            user.password_hash = get_password_hash(QUICK_ACCESS_PASSWORD)

            if user.profile:
                user.profile.department = entry["department"]
                user.profile.timezone = "Asia/Kolkata"
                user.profile.location = entry["location"]
                user.profile.bio = entry["bio"]
            else:
                db.add(
                    EmployeeProfile(
                        user_id=user.id,
                        employee_code=entry["employee_code"],
                        department=entry["department"],
                        timezone="Asia/Kolkata",
                        location=entry["location"],
                        bio=entry["bio"],
                    )
                )

            db.add(user)
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
