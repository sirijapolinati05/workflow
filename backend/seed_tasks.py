from app.database.session import SessionLocal
from app.models import Task, User, Role, RoleName, TaskPriority, TaskStatus
import uuid

def seed_tasks():
    db = SessionLocal()
    try:
        admin = db.query(User).join(Role).filter(Role.name == RoleName.ADMIN).first()
        employee = db.query(User).join(Role).filter(Role.name == RoleName.EMPLOYEE).first()
        
        if not admin or not employee:
            print("Users not found. Run seed_data.py first.")
            return

        tasks = [
            {
                "title": "Complete Project Documentation",
                "description": "Write and review the final documentation for the Q3 release.",
                "status": TaskStatus.PENDING,
                "priority": TaskPriority.HIGH,
                "assigned_to_id": employee.id,
                "created_by_id": admin.id
            },
            {
                "title": "Bug Fix: Login Page Layout",
                "description": "Fix the alignment issue on the mobile login screen.",
                "status": TaskStatus.IN_PROGRESS,
                "priority": TaskPriority.MEDIUM,
                "assigned_to_id": employee.id,
                "created_by_id": admin.id
            }
        ]

        for t_data in tasks:
            task = Task(**t_data)
            db.add(task)
        
        db.commit()
        print(f"Seeded {len(tasks)} tasks.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_tasks()
