from app.database.session import engine
from app.models.base import Base
from app.models.entities import *

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Tables dropped and recreated!")
