from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg://pavan:Sirija2004@localhost:5433/workflow_db"

def add_links_column():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN links JSON;"))
            conn.commit()
            print("Successfully added 'links' column to 'submissions' table.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column 'links' already exists.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    add_links_column()
