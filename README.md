# VM Management Portal

A modern full-stack cloud management portal for managing OpenStack virtual machines. Built with React, Flask, PostgreSQL, and Docker.

## Features

- **User Authentication**
  - Secure login/logout with JWT tokens
  - Password hashing with bcrypt
  - Session management
  - Default admin account (admin/admin123)

- **VM Management**
  - List all instances from OpenStack
  - Create new instances with custom configuration
  - Start, stop, and reboot instances
  - Delete instances
  - View instance details and status

- **Cloud Resource Management**
  - Browse available flavors (instance sizes)
  - Browse available images (operating systems)
  - Browse available networks
  - Console access via noVNC

- **Dashboard**
  - Real-time statistics
  - Quick action buttons
  - System health status
  - OpenStack connection status

- **Additional Services**
  - noVNC console access
  - Prometheus monitoring
  - Activity logging
  - VM operation audit logs

## Architecture

```
┌──────────────────────────────────────────┐
│           Docker Compose Setup            │
├──────────────────────────────────────────┤
│                                          │
│  ┌─────────────────────────────────┐   │
│  │   Nginx (Port 80)               │   │
│  │   (Reverse Proxy)               │   │
│  └────────────────────┬────────────┘   │
│                       │                 │
│        ┌──────────────┼──────────────┐  │
│        │              │              │  │
│   ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
│   │ Frontend │   │ Backend  │   │ Services │
│   │ (React)  │   │ (Flask)  │   │ (noVNC)  │
│   │ Port 5173│   │ Port 5000│   │          │
│   └────┬────┘   └────┬────┘   └────┬────┘
│        │              │              │
│   ┌────┴──────────────┴──────────────┴────┐
│   │   PostgreSQL (Port 5432)               │
│   │   Redis (Port 6379)                    │
│   │   Prometheus (Port 9090)               │
│   └────────────────────────────────────────┘
│
│   ◆ All communicate over internal network
│
└──────────────────────────────────────────┘
         ▲                          
         │ External Access         
         │ Port 80 (HTTP)         
         │                        
    ┌────┴──────────────┐
    │  OpenStack DevStack│
    │  192.168.91.128   │
    └──────────────────┘
```

## Prerequisites

- Docker & Docker Compose installed
- OpenStack DevStack environment running at 192.168.91.128
- OpenStack credentials (admin/pfestack26 by default)

## Quick Start

### 1. Clone/Setup Project

```bash
cd "c:\Users\Youssef\Desktop\PFE Portal"
```

### 2. Configure Environment

The `.env` file is already configured with default values. For production, update these values:

```bash
# Edit .env file
SECRET_KEY=your-production-secret-key
JWT_SECRET_KEY=your-production-jwt-secret-key
OPENSTACK_PASSWORD=your-openstack-password
```

### 3. Start Services

```bash
docker-compose up --build
```

This will:
- Build and start all containers
- Initialize PostgreSQL with schema
- Create default admin user
- Expose services on configured ports

### 4. Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| Web UI | http://localhost | Main dashboard |
| API | http://localhost/api | Backend API |
| noVNC Console | http://localhost:6080 | VM console |
| Prometheus | http://localhost:9090 | Metrics dashboard |

### 5. Login

```
Username: admin
Password: admin123
```

## Project Structure

```
PFE Portal/
├── backend/                          # Flask backend
│   ├── app/
│   │   ├── routes/                   # API route handlers
│   │   │   ├── auth.py               # Authentication endpoints
│   │   │   ├── vms.py                # VM management endpoints
│   │   │   ├── health.py             # Health check
│   │   │   └── monitoring.py         # Prometheus metrics
│   │   ├── models/
│   │   │   └── user.py               # User, ActivityLog, VMLog models
│   │   ├── utils/
│   │   │   └── openstack.py          # OpenStack SDK wrapper
│   │   └── __init__.py               # Flask app factory
│   ├── requirements.txt              # Python dependencies
│   ├── wsgi.py                       # WSGI entry point
│   └── Dockerfile                    # Backend container
│
├── frontend/                         # React + Vite frontend
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── VMManagementPage.jsx
│   │   ├── components/               # Reusable components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Notification.jsx
│   │   │   └── Common.jsx
│   │   ├── services/                 # API services
│   │   │   └── api.js
│   │   ├── hooks/                    # Custom hooks
│   │   │   └── useAuth.js
│   │   ├── store.js                  # Zustand state management
│   │   ├── App.jsx                   # Main app component
│   │   ├── main.jsx                  # Entry point
│   │   └── index.css                 # Global styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   ├── Dockerfile                    # Frontend container
│   └── .gitignore
│
├── database/
│   └── init.sql                      # PostgreSQL initialization script
│
├── nginx/
│   └── nginx.conf                    # Nginx reverse proxy config
│
├── prometheus/
│   └── prometheus.yml                # Prometheus configuration
│
├── docker-compose.yml                # Docker Compose orchestration
├── .env                              # Environment variables
├── .env.example                      # Example environment file
├── README.md                         # This file
└── .gitignore
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/current-user` - Get current user info
- `GET /api/auth/verify-token` - Verify JWT token

### VM Management
- `GET /api/vms/instances` - List all instances
- `GET /api/vms/instances/<id>` - Get instance details
- `POST /api/vms/instances` - Create new instance
- `DELETE /api/vms/instances/<id>` - Delete instance
- `POST /api/vms/instances/<id>/start` - Start instance
- `POST /api/vms/instances/<id>/stop` - Stop instance
- `POST /api/vms/instances/<id>/reboot` - Reboot instance
- `GET /api/vms/instances/<id>/console` - Get console URL

### Resources
- `GET /api/vms/flavors` - List available flavors
- `GET /api/vms/images` - List available images
- `GET /api/vms/networks` - List available networks

### Monitoring
- `GET /api/health` - Health check
- `GET /api/metrics` - Prometheus metrics
- `GET /api/vms/stats` - VM statistics

## Configuration

### Database

The PostgreSQL database is automatically initialized with:
- `users` table - User accounts with hashed passwords
- `activity_logs` table - Login attempts and user actions
- `vm_logs` table - VM operation history

### OpenStack Integration

Update OpenStack configuration in `.env`:

```env
OPENSTACK_AUTH_URL=http://192.168.91.128/identity
OPENSTACK_USERNAME=admin
OPENSTACK_PASSWORD=pfestack26
OPENSTACK_PROJECT_NAME=admin
OPENSTACK_USER_DOMAIN_NAME=Default
OPENSTACK_PROJECT_DOMAIN_NAME=Default
OPENSTACK_REGION_NAME=RegionOne
```

### Security

**Important:** For production deployment:

1. Generate strong secret keys:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. Update environment variables in `.env`

3. Set up HTTPS (update nginx configuration with SSL certificates)

4. Change default admin password:
```bash
docker-compose exec backend python
>>> from app import db, create_app
>>> from app.models.user import User
>>> app = create_app()
>>> with app.app_context():
>>>     user = User.query.filter_by(username='admin').first()
>>>     user.password_hash = User.hash_password('new_password')
>>>     db.session.commit()
```

## Docker Commands

```bash
# Start all services
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v

# Rebuild specific service
docker-compose build --no-cache backend
docker-compose up backend

# Execute command in container
docker-compose exec backend bash
docker-compose exec db psql -U postgres -d vm_portal
```

## Database Management

### Connect to PostgreSQL

```bash
docker-compose exec db psql -U postgres -d vm_portal
```

### Useful SQL Queries

```sql
-- List all users
SELECT id, username, role, created_at FROM users;

-- View activity logs
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20;

-- View VM operation logs
SELECT * FROM vm_logs ORDER BY created_at DESC LIMIT 20;
```

## Troubleshooting

### Can't connect to OpenStack

1. Verify OpenStack is running and accessible:
```bash
curl http://192.168.91.128/identity
```

2. Check backend logs:
```bash
docker-compose logs backend | grep -i openstack
```

3. Verify credentials in `.env`

### Login fails

1. Check database connection:
```bash
docker-compose exec db psql -U postgres -d vm_portal -c "SELECT * FROM users;"
```

2. Verify user exists and password hash is set:
```bash
docker-compose exec backend python -c "
from app import create_app
from app.models.user import User
app = create_app()
with app.app_context():
    user = User.query.filter_by(username='admin').first()
    print(f'User found: {user}')
    print(f'Password hash: {user.password_hash if user else \"User not found\"}')"
```

### Frontend not loading

1. Check if Nginx is running:
```bash
docker-compose ps | grep nginx
```

2. Check Nginx logs:
```bash
docker-compose logs nginx
```

3. Verify frontend build succeeded:
```bash
docker-compose logs frontend | grep -i error
```

### Port already in use

If ports are already in use, modify docker-compose.yml:
```yaml
ports:
  - "8080:80"      # Map port 8080 to internal 80
  - "5001:5000"    # Map port 5001 to internal 5000
```

## Performance Optimization

- Redis caching enabled for session management
- Prometheus monitoring for performance metrics
- Connection pooling in SQLAlchemy
- Gunicorn workers (4) for Flask
- Nginx reverse proxy caching

## Development

### Run without Docker

Backend:
```bash
cd backend
pip install -r requirements.txt
python wsgi.py
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Build Frontend

```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/`

## Monitoring

Access Prometheus dashboard at http://localhost:9090

Available metrics:
- API request counts and latencies
- Login attempts (success/failed)
- VM operation counts
- Active instances count
- System resource usage

## Support & Documentation

- OpenStack SDK: https://docs.openstack.org/openstacksdk/
- Flask: https://flask.palletsprojects.com/
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/

## License

Proprietary - PFE Project

## Version

Version 1.0.0 - 2026
