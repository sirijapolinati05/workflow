import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")

print(f"Connecting to database...")

try:
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            tables_to_check = [
                "roles", "users", "employee_profiles", "groups", "tasks", "submissions",
                "messages", "notifications", "task_updates", "submission_files",
                "attendance_logs", "leave_requests", "reports", "audit_logs", "group_members"
            ]

            for table in tables_to_check:
                try:
                    # Check if updated_at exists
                    cur.execute(f"SELECT 1 FROM information_schema.columns WHERE table_name='{table}' AND column_name='updated_at'")
                    if not cur.fetchone():
                        print(f"Adding updated_at to {table}")
                        cur.execute(f"ALTER TABLE {table} ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();")
                        
                        # Try to sync with created_at or joined_at
                        cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name IN ('created_at', 'joined_at')")
                        time_col = cur.fetchone()
                        if time_col:
                            col_name = time_col[0]
                            cur.execute(f"UPDATE {table} SET updated_at = {col_name} WHERE updated_at IS NULL OR updated_at = NOW();")
                        
                        print(f"Successfully updated {table}")
                    else:
                        pass # print(f"Column updated_at already exists in {table}")
                except Exception as e:
                    print(f"Error updating {table}: {e}")
                    conn.rollback()
            
            conn.commit()
except Exception as e:
    print(f"Connection failed: {e}")

print("Database sync complete!")
