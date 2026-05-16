import psycopg

def migrate():
    conn_str = "postgresql://pavan:Sirija2004@localhost:5433/workflow_db"
    try:
        with psycopg.connect(conn_str) as conn:
            with conn.cursor() as cur:
                cur.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}';")
                conn.commit()
                print("Successfully added reactions column to messages table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
