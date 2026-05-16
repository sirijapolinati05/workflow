import sqlalchemy
from sqlalchemy import create_engine, select
import sys

db_url = "postgresql+psycopg://pavan:Sirija2004@localhost:5433/workflow_db"
print(f"Connecting to {db_url}...")
try:
    engine = create_engine(db_url, future=True)
    with engine.connect() as conn:
        print("Connected! Running query...")
        result = conn.execute(select(1)).scalar()
        print(f"Result: {result}")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
print("Success!")
