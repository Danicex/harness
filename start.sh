#!/bin/bash

# Exit immediately if any command fails
set -e

# Store the root directory path
ROOT_DIR=$(pwd)

echo "Starting frontend..."
cd "$ROOT_DIR/frontend"
# Run in background and redirect output if you want a cleaner terminal
npm run dev & 

echo "Opening frontend project on browser..."
# Optional: add your browser opening command here if needed (e.g., 'open http://localhost:5173' or 'xdg-open')

echo "Starting backend..."
cd "$ROOT_DIR/server"
source ./myenv/bin/activate
fastapi dev ./app/main.py &

# Wait for all background processes to finish
wait
