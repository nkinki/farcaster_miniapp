import os
from dotenv import load_dotenv

print(f"Current Working Directory: {os.getcwd()}")
print(f"Checking for .env file: {os.path.exists('.env')}")

loaded = load_dotenv()
print(f"load_dotenv() success: {loaded}")

db_url = os.getenv("DATABASE_URL")
if db_url:
    print(f"DATABASE_URL: {db_url[:20]}...")
else:
    print("DATABASE_URL not found in env")

# List all loaded keys (excluding sensitive values)
import dotenv
env_vars = dotenv.dotenv_values(".env")
print(f"Keys found in .env: {list(env_vars.keys())}")
