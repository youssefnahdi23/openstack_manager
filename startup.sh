#!/bin/bash

# VM Portal - Startup Script
# This script initializes and starts the entire stack

set -e

echo "========================================="
echo "VM Portal - Full Stack Startup"
echo "========================================="

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Created .env file from template"
        echo "⚠️  Please update .env with your configuration before running again"
        exit 1
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
fi

echo "✓ .env file exists"

# Pull latest images
echo ""
echo "Pulling latest Docker images..."
docker-compose pull

# Build images
echo ""
echo "Building Docker images..."
docker-compose build --no-cache

# Start services
echo ""
echo "Starting services..."
docker-compose up -d

# Wait for database to be ready
echo ""
echo "Waiting for database to be ready..."
max_attempts=30
attempt=0

until docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    attempt=$((attempt+1))
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Database failed to start"
        exit 1
    fi
    echo "Waiting... ($attempt/$max_attempts)"
    sleep 1
done

echo "✓ Database is ready"

# Wait for backend to be ready
echo ""
echo "Waiting for backend to be ready..."
attempt=0

until curl -sf http://localhost:5000/api/health > /dev/null 2>&1 || [ $attempt -ge 30 ]; do
    attempt=$((attempt+1))
    echo "Waiting... ($attempt/30)"
    sleep 1
done

echo "✓ Backend is ready"

echo ""
echo "========================================="
echo "✓ VM Portal is running!"
echo "========================================="
echo ""
echo "Access the application at:"
echo "  • Main UI: http://localhost"
echo "  • API: http://localhost/api"
echo "  • Web Terminal: http://localhost/ttyd"
echo "  • noVNC: http://localhost:6080"
echo "  • Prometheus: http://localhost:9090"
echo ""
echo "Login with:"
echo "  • Username: admin"
echo "  • Password: admin123"
echo ""
echo "View logs with:"
echo "  • docker-compose logs -f"
echo ""
echo "Stop services with:"
echo "  • docker-compose down"
echo ""
