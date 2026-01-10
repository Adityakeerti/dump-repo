#!/bin/bash

# ============================================================
# Campus Intelligence System - Start All Services (Linux/Mac)
# ============================================================

set -e

echo "=================================================="
echo "  Starting Unified Campus Intelligence System"
echo "  (Restructured Layout)"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    local port=$1
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# Check MongoDB
echo ""
echo "[0/6] Checking MongoDB..."
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${RED}⚠ MongoDB is not running. Agent service requires MongoDB.${NC}"
    echo "  Start with: mongod --dbpath /data/db"
fi

# Kill existing processes
echo ""
echo "[1/6] Cleaning up existing processes..."
kill_port 8080
kill_port 8082
kill_port 8083
kill_port 8000
kill_port 8010
kill_port 8002
sleep 2
echo "Cleanup complete."

# Start Java services
echo ""
echo "[2/6] Starting Auth Service (Port 8080)..."
cd services/auth && ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.address=0.0.0.0 &
cd ../..

echo ""
echo "[3/6] Starting Meeting Service (Port 8082)..."
cd services/meeting && ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.address=0.0.0.0 &
cd ../..

echo ""
echo "[4/6] Starting Chat Service (Port 8083)..."
cd services/chat && ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.address=0.0.0.0 &
cd ../..

# Start Python services
echo ""
echo "[5/6] Starting Python Services..."
cd services/ocr && python main.py --host 0.0.0.0 &
cd ../..

cd services/agent && uvicorn api.app:app --host 0.0.0.0 --port 8010 --reload &
cd ../..

cd services/library && uvicorn main:app --host 0.0.0.0 --port 8002 --reload &
cd ../..

echo ""
echo "[6/6] All services starting..."
echo ""
echo "=================================================="
echo "  Services:"
echo "    Auth:     http://localhost:8080"
echo "    Meeting:  http://localhost:8082"
echo "    Chat:     http://localhost:8083"
echo "    OCR:      http://localhost:8000"
echo "    Agent:    http://localhost:8010"
echo "    Library:  http://localhost:8002"
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for all background processes
wait
