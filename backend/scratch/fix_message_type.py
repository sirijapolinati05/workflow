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
            print("Altering messages.attachment_url to TEXT...")
            cur.execute("ALTER TABLE messages ALTER COLUMN attachment_url TYPE TEXT;")
            conn.commit()
            print("Successfully altered messages.attachment_url")
except Exception as e:
    print(f"Failed to alter table: {e}")

print("Done!")
