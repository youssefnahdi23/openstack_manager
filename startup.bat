@echo off
REM VM Portal - Startup Script for Windows
REM This script initializes and starts the entire stack

setlocal enabledelayedexpansion

echo =========================================
echo VM Portal - Full Stack Startup
echo =========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo X Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

echo + Docker is installed

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo X Docker Compose is not installed. Please install Docker Desktop first.
    exit /b 1
)

echo + Docker Compose is installed

REM Check if .env file exists
if not exist ".env" (
    echo - .env file not found. Creating from template...
    if exist ".env.example" (
        copy .env.example .env
        echo + Created .env file from template
        echo - Please update .env with your configuration before running again
        exit /b 1
    ) else (
        echo X .env.example file not found
        exit /b 1
    )
)

echo + .env file exists
echo.

echo Pulling latest Docker images...
docker-compose pull

echo.
echo Building Docker images...
docker-compose build --no-cache

echo.
echo Starting services...
docker-compose up -d

echo.
echo Waiting for database to be ready...
timeout /t 5 /nobreak

echo.
echo =========================================
echo + VM Portal is starting!
echo =========================================
echo.
echo Access the application at:
echo   * Main UI: http://localhost
echo   * API: http://localhost/api
echo   * Web Terminal: http://localhost:7681
echo   * noVNC: http://localhost:6080
echo   * Prometheus: http://localhost:9090
echo.
echo Login with:
echo   * Username: admin
echo   * Password: admin123
echo.
echo View logs with:
echo   * docker-compose logs -f
echo.
echo Stop services with:
echo   * docker-compose down
echo.
