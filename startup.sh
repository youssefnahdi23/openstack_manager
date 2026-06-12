#!/bin/bash

# VM Portal - Startup Script
# This script initializes and starts the entire web application stack using Docker Compose. It performs the following steps:
# 1. Checks for Docker and Docker Compose installation.
# 2. Ensures the .env file exists (creates from template if missing).
# 3. Prompts for OPENSTACK_AUTH_URL if not set and persists it to .env.
# 4. Pulls the latest Docker images.
# 5. Builds the Docker images.
# 6. Starts the services in detached mode.
# 7. Waits for the database and backend to be ready before confirming successful startup.

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
        echo "You can update .env later; missing values will be prompted now."
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
fi

echo "✓ .env file exists"

# Ensure OPENSTACK_AUTH_URL is set (prompt and persist if missing)
if [ -z "${OPENSTACK_AUTH_URL:-}" ]; then
    echo ""
    echo "OPENSTACK_AUTH_URL is not set. This is required to connect to OpenStack/DevStack."
    read -p "Enter OpenStack identity URL (e.g. http://192.168.91.128/identity): " input
    if [ -z "$input" ]; then
        echo "❌ No OpenStack URL provided. Aborting."
        exit 1
    fi
    # Optional quick check
    if ! curl -sf "$input" > /dev/null 2>&1; then
        echo "⚠️ Warning: Failed to reach $input. Continue? [y/N]"
        read -r ans
        if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
            echo "Aborting."
            exit 1
        fi
    fi
    # Persist to .env (replace if present, append otherwise)
    if grep -q '^OPENSTACK_AUTH_URL=' .env >/dev/null 2>&1; then
        sed -i.bak "s|^OPENSTACK_AUTH_URL=.*|OPENSTACK_AUTH_URL=$input|" .env
    else
        echo "OPENSTACK_AUTH_URL=$input" >> .env
    fi
    export OPENSTACK_AUTH_URL="$input"
    echo "✓ OPENSTACK_AUTH_URL set to $input and saved to .env"
else
    echo "Using OPENSTACK_AUTH_URL=$OPENSTACK_AUTH_URL"
fi

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
