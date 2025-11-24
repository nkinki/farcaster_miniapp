import os
import shutil

root_dir = '.'
safe_dirs = {'.git', '.github', '.next', '.qodo', '.vercel', '.vscode', '.zencoder', 'lib', 'migrations', 'node_modules', 'prisma', 'public', 'scripts', 'src', '__pycache__', '.gemini'}
safe_extensions = {'.env', '.example', '.local', '.production', '.vercel', '.gitignore', '.md', '.json', '.js', '.ts', '.mjs', '.txt', '.sql', '.py', '.lock'}
safe_files = {'LICENSE', 'README', 'Dockerfile', '.dockerignore'}

for item in os.listdir(root_dir):
    if item in safe_dirs:
        continue
    
    # Check if it's a known safe file pattern
    is_safe = False
    for ext in safe_extensions:
        if item.endswith(ext) or item.startswith('.env'):
            is_safe = True
            break
    if item in safe_files:
        is_safe = True
        
    if not is_safe:
        # Check if it's a directory
        if os.path.isdir(item):
            print(f"Skipping unknown directory (might be safe): {item}")
            # shutil.rmtree(item) # Be careful with directories
        else:
            print(f"Deleting suspicious file: {item}")
            try:
                os.remove(item)
            except Exception as e:
                print(f"Error deleting {item}: {e}")
