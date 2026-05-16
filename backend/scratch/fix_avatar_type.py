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
            print("Altering users.avatar_url to TEXT...")
            cur.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;")
            
            # Also check groups table if it has avatar_url or similar
            # Based on entities.py, Group doesn't have avatar_url yet, but maybe it does in DB?
            # Wait, in Group model:
            # 91:     name: Mapped[str] = mapped_column(String(120), nullable=False)
            
            # Let's check for any other String(500) that might be used for images
            # Submission.deployment_link is String(500) - fine
            # Message.attachment_url is String(500) - fine for URLs, but if they upload Base64 it will fail.
            # Let's just fix users.avatar_url for now as that's the error.
            
            conn.commit()
            print("Successfully altered users.avatar_url")
except Exception as e:
    print(f"Failed to alter table: {e}")

print("Done!")
