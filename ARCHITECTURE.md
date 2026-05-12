# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL USERS                                   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP/HTTPS Port 80/443
                                     │
                    ┌────────────────▼─────────────────┐
                    │   NGINX Reverse Proxy            │
                    │   - Route management             │
                    │   - SSL/TLS termination          │
                    │   - Load balancing               │
                    │   - Compression                  │
                    └────────────────┬─────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         │ Port 5173            Port 5000             Services
         │
    ┌────▼────────┐        ┌────────▼────────┐    ┌──────────┐
    │   React     │        │   Flask         │    │  ttyd    │
    │  Frontend   │        │  Backend        │    │  7681    │
    │ (Vite)      │        │  API            │    │          │
    │             │        │                 │    │  noVNC   │
    │ - SPA       │        │ - Auth routes   │    │  6080    │
    │ - Login     │        │ - VM routes     │    │          │
    │ - Dashboard │        │ - Health check  │    │Prometheus│
    │ - VM Mgmt   │        │ - Metrics       │    │  9090    │
    └─────┬───────┘        └────────┬────────┘    └──────────┘
          │                          │
          │         ┌────────────────┼────────────────┐
          │         │                │                │
          │    ┌────▼─────┐   ┌─────▼──────┐  ┌────▼─────┐
          │    │PostgreSQL│   │  Redis     │  │ OpenStack│
          │    │  5432    │   │  6379      │  │ DevStack │
          │    │          │   │            │  │192.168.91│
          │    │ - users  │   │ - Sessions │  │.128      │
          │    │ - logs   │   │ - Cache    │  │          │
          │    │ - VM logs│   │ - Tokens   │  │- Compute │
          │    └──────────┘   └────────────┘  │- Identity│
          │                                    └──────────┘
          └────────────────┬────────────────────┘
                           │
                    Docker Network
```

## Component Details

### Frontend (React + Vite)
- **Port:** 5173 (dev) / 5173 (prod via Nginx)
- **Framework:** React 18 + Vite
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Components:**
  - LoginPage: User authentication
  - DashboardPage: Statistics and quick actions
  - VMManagementPage: VM lifecycle management
  - MonitoringPage: Prometheus metrics display
  - Sidebar: Navigation
  - Notifications: Toast notifications

### Backend (Flask)
- **Port:** 5000
- **Framework:** Flask + Gunicorn (4 workers)
- **Database:** SQLAlchemy ORM
- **Authentication:** JWT tokens
- **Modules:**
  - `routes/auth.py`: Authentication endpoints
  - `routes/vms.py`: VM management endpoints
  - `routes/health.py`: Health check
  - `routes/monitoring.py`: Prometheus metrics
  - `models/user.py`: User, ActivityLog, VMLog models
  - `utils/openstack.py`: OpenStack SDK wrapper

### Database (PostgreSQL)
- **Port:** 5432
- **Version:** 15
- **Tables:**
  - `users`: User accounts with hashed passwords
  - `activity_logs`: Login attempts and user actions
  - `vm_logs`: VM operation history
- **Features:**
  - Connection pooling
  - Automatic backups
  - Persistent volumes

### Cache/Sessions (Redis)
- **Port:** 6379
- **Version:** 7
- **Purpose:**
  - Session storage
  - Token caching
  - Application cache

### Web Services
- **ttyd (7681):** Web terminal access
- **noVNC (6080):** Browser-based VM console
- **Prometheus (9090):** Metrics collection and visualization

### External: OpenStack DevStack
- **Address:** 192.168.91.128
- **Ports:** 5000 (Identity), 8774 (Compute), 9292 (Image)
- **Authentication:** Admin user with credentials in .env
- **Services Used:**
  - Keystone (Identity)
  - Nova (Compute)
  - Glance (Image)
  - Neutron (Network)

## Data Flow

### Authentication Flow
```
User Input
    │
    ▼
[React] LoginPage
    │ sends username/password
    ▼
[Nginx] Route to /api/auth/login
    │
    ▼
[Flask] auth.py - login()
    │ verify credentials against DB
    ▼
[PostgreSQL] users table
    │
    ▼
[Flask] Generate JWT token
    │
    ▼
[React] Store token in localStorage
    │
    ▼
Set Authorization header for subsequent requests
```

### VM Management Flow
```
User Action (e.g., Create VM)
    │
    ▼
[React] Form submission
    │ includes JWT token
    ▼
[Nginx] Route to /api/vms/instances
    │
    ▼
[Flask] vms.py - create_instance()
    │ validate token
    │ validate input
    ▼
[OpenStack] SDK communication
    │
    ▼
[DevStack] Create instance
    │
    ▼
[PostgreSQL] Log operation in vm_logs
    │
    ▼
[Flask] Return response
    │
    ▼
[React] Update UI and show notification
```

## Security Architecture

### Authentication
- JWT tokens for stateless authentication
- Tokens stored in localStorage (frontend)
- 30-day token expiration
- Automatic logout on token expiration

### Password Security
- bcrypt hashing (12 rounds)
- Never stored in plain text
- Validated on each login

### API Security
- CORS properly configured
- Token validation on all protected routes
- Input validation on all endpoints
- SQL injection prevention via SQLAlchemy ORM
- Error messages don't expose sensitive info

### Network Security
- Services communicate over internal Docker network
- Nginx reverse proxy restricts direct access
- Optional SSL/TLS support
- Security headers (X-Frame-Options, X-Content-Type-Options)

## Scaling Considerations

### Horizontal Scaling
- Multiple Flask instances behind load balancer
- PostgreSQL with read replicas
- Redis cluster for session management
- Nginx load balancing

### Vertical Scaling
- Increase Gunicorn workers
- Increase database connection pool
- Increase Redis memory allocation

### Performance
- Database query optimization
- Redis caching layer
- Frontend code splitting with Vite
- Gzip compression

## Monitoring & Observability

### Prometheus Metrics
- API request counts and latencies
- Login attempts (success/failed)
- VM operation metrics
- Active instance counts
- System resource usage

### Logging
- Flask application logs
- Database query logs
- Nginx access logs
- Container logs via Docker

### Health Checks
- Database connectivity
- OpenStack connectivity
- API health endpoint
- Service liveness probes

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.2.0 |
| Frontend Build | Vite | 5.0.0 |
| Frontend Styling | Tailwind CSS | 3.3.6 |
| Frontend State | Zustand | 4.4.1 |
| Backend | Flask | 2.3.3 |
| Backend WSGI | Gunicorn | 21.2.0 |
| Database | PostgreSQL | 15 |
| ORM | SQLAlchemy | 2.0.23 |
| Cache | Redis | 7 |
| Container | Docker | Latest |
| Orchestration | Docker Compose | 3.8 |
| Reverse Proxy | Nginx | Alpine |
| Monitoring | Prometheus | Latest |
| Credentials | bcrypt | 4.1.1 |
| JWT | PyJWT | 2.8.1 |
| OpenStack SDK | openstacksdk | 0.103.0 |

## Deployment Modes

### Development
```
Single host deployment
- No SSL/TLS
- Debug mode enabled
- Development database
- Minimal resources
```

### Production
```
Same host deployment with:
- SSL/TLS enabled
- Debug mode disabled
- Production database configuration
- Monitoring and alerting
- Backup and recovery procedures
- High availability considerations
```

### High Availability
```
Multi-host deployment with:
- Load balancer
- Multiple API servers
- Database replication
- Shared storage
- Auto-scaling
```
