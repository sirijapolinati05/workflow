import asyncio
import os
import uuid
from pathlib import Path

# A simple test to simulate the upload
print("Testing upload logic...")
if not os.path.exists("uploads/submissions"):
    os.makedirs("uploads/submissions", exist_ok=True)
    
test_id = str(uuid.uuid4())
folder_path = f"uploads/submissions/{test_id}"
os.makedirs(folder_path, exist_ok=True)

file_path = f"{folder_path}/test_image.txt"
with open(file_path, "wb") as f:
    f.write(b"fake image data")

print(f"Created file at {file_path}")
print(f"Files in uploads: {os.listdir('uploads')}")
print(f"Files in submissions: {os.listdir('uploads/submissions')}")
