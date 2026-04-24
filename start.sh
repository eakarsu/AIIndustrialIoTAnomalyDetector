#!/bin/bash

# AI Industrial IoT Anomaly Detector - Start Script
# ==================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  AI Industrial IoT Anomaly Detector${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Load env vars
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Loaded .env configuration${NC}"
else
  echo -e "${RED}✗ .env file not found! Create one from .env example${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
DB_NAME=${DB_NAME:-iot_anomaly_detector}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# ============================================
# Clean used ports
# ============================================
echo -e "\n${YELLOW}Cleaning used ports...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti tcp:$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  echo -e "  ${GREEN}✓ Port $port is free${NC}"
}

cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT

# ============================================
# Check PostgreSQL
# ============================================
echo -e "\n${YELLOW}Checking PostgreSQL...${NC}"

if ! command -v psql &> /dev/null; then
  echo -e "${RED}✗ PostgreSQL client (psql) not found. Please install PostgreSQL.${NC}"
  exit 1
fi

if ! pg_isready -h $DB_HOST -p $DB_PORT -q 2>/dev/null; then
  echo -e "${YELLOW}Starting PostgreSQL...${NC}"
  if command -v brew &> /dev/null; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    sleep 2
  fi
  if ! pg_isready -h $DB_HOST -p $DB_PORT -q 2>/dev/null; then
    echo -e "${RED}✗ PostgreSQL is not running. Please start it manually.${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# ============================================
# Create database if not exists
# ============================================
echo -e "\n${YELLOW}Setting up database...${NC}"

if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "  Creating database '$DB_NAME'..."
  PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER "$DB_NAME" 2>/dev/null || true
fi
echo -e "${GREEN}✓ Database '$DB_NAME' ready${NC}"

# ============================================
# Install dependencies
# ============================================
echo -e "\n${YELLOW}Installing dependencies...${NC}"

cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ]; then
  echo -e "  Installing backend dependencies..."
  npm install
else
  echo -e "  ${GREEN}✓ Backend dependencies already installed${NC}"
fi

cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "  Installing frontend dependencies..."
  npm install
else
  echo -e "  ${GREEN}✓ Frontend dependencies already installed${NC}"
fi

cd "$PROJECT_DIR"

# ============================================
# Seed database
# ============================================
echo -e "\n${YELLOW}Seeding database...${NC}"
cd "$PROJECT_DIR/backend"
node seed.js
echo -e "${GREEN}✓ Database seeded with sample data${NC}"

# ============================================
# Start services with hot reload
# ============================================
echo -e "\n${YELLOW}Starting services with hot reload...${NC}"

# Function to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GREEN}✓ All services stopped${NC}"
}
trap cleanup EXIT INT TERM

# Start backend with nodemon (hot reload)
cd "$PROJECT_DIR/backend"
echo -e "${CYAN}Starting backend on port $BACKEND_PORT (with nodemon hot reload)...${NC}"
npx nodemon server.js &
BACKEND_PID=$!

# Start frontend with Vite (hot reload built-in)
cd "$PROJECT_DIR/frontend"
echo -e "${CYAN}Starting frontend on port $FRONTEND_PORT (with Vite HMR)...${NC}"
npm run dev &
FRONTEND_PID=$!

cd "$PROJECT_DIR"

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  Application is running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e ""
echo -e "  Frontend:  ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:   ${CYAN}http://localhost:$BACKEND_PORT${NC}"
echo -e ""
echo -e "  Login:     ${YELLOW}admin@iotplatform.com / password123${NC}"
echo -e ""
echo -e "  ${YELLOW}Hot reload is enabled - save files to see changes${NC}"
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
echo -e ""

# Wait for any background process to exit
wait
