#!/bin/bash
echo "opening project in vs code"
code .
# Start frontend app (react app)
echo "Starting frontend..."
cd ./frontend
npm run dev &
echo "opening frontend project on browser"
google-chrome http://localhost:5173/
# Navigate back to root and start backend app (fastapi app)
echo "Starting backend..."
cd ../server
source ./myenv/bin/activate
fastapi dev ./app/main.py
echo "opening backend project on browser"
google-chrome http://localhost:8000/docs
# Wait for all background processes to finish
wait