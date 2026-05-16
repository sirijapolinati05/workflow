from sqlalchemy import text
from app.database.session import engine

def main():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN feedback TEXT;"))
            print("Successfully added feedback column.")
        except Exception as e:
            print(f"Error (maybe column exists?): {e}")

if __name__ == "__main__":
    main()
