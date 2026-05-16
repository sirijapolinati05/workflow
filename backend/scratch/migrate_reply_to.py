from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg://pavan:Sirija2004@localhost:5433/workflow_db"

def run_migration():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print("Adding reply_to_id column to messages table...")
        try:
            connection.execute(text("ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id)"))
            connection.commit()
            print("Successfully added reply_to_id column.")
        except Exception as e:
            print(f"Error adding column: {e}")
            print("Trying without the constraint first...")
            try:
                connection.execute(text("ALTER TABLE messages ADD COLUMN reply_to_id UUID"))
                connection.commit()
                print("Successfully added reply_to_id column (no constraint).")
            except Exception as e2:
                print(f"Final error: {e2}")

if __name__ == "__main__":
    run_migration()
