# Quick Start Guide

## Prerequisites

- Docker & Docker Compose installed
- Windows, macOS, or Linux
- 4GB RAM minimum
- 10GB disk space
- OpenStack DevStack running at 192.168.91.128 (optional - for full functionality)

## Installation (5 minutes)

### 1. Navigate to Project
```bash
cd "c:\Users\Youssef\Desktop\PFE Portal"
```

### 2. Start All Services
**Windows:**
```powershell
.\startup.bat
```

**Linux/macOS:**
```bash
bash startup.sh
```

**Manual Start (All platforms):**
```bash
docker-compose up --build -d
```

### 3. Wait for Services
Services will be ready in ~30-60 seconds. Check with:
```bash
docker-compose ps
```

All services should show "Up".

### 4. Access Portal
Open in browser:
```
http://localhost
```

### 5. Login
```
Username: admin
Password: admin123
```

## What You Get

### Dashboard
- Real-time statistics
- System health status
- Quick action buttons
- OpenStack connection status

### VM Management
- List all instances
- Create new VMs
- Start, stop, reboot instances
- Delete instances
- Open console access

### Web Terminal
- Terminal access at http://localhost:7681
- Bash shell in container

### Console Access
- noVNC for VM consoles
- Access at http://localhost:6080

### Monitoring
- Prometheus metrics at http://localhost:9090
- System and API metrics
- Custom dashboard

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres -d vm_portal

# List users
SELECT * FROM users;

# View activity logs
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;

# Exit
\q
```

### Rebuild Services
```bash
# Rebuild all
docker-compose build --no-cache

# Rebuild specific service
docker-compose build --no-cache backend

# Restart services
docker-compose up -d
```

### Stop Services
```bash
# Stop (keeps data)
docker-compose stop

# Stop and remove (keeps data)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

## Troubleshooting

### Port Already in Use
Edit `docker-compose.yml` and change port mapping:
```yaml
nginx:
  ports:
    - "8080:80"  # Use 8080 instead of 80
```

Then access at http://localhost:8080

### Can't Login
1. Ensure database is running:
   ```bash
   docker-compose exec db psql -U postgres -c "SELECT 1"
   ```

2. Check for admin user:
   ```bash
   docker-compose exec db psql -U postgres -d vm_portal -c "SELECT * FROM users;"
   ```

3. Restart backend:
   ```bash
   docker-compose restart backend
   ```

### OpenStack Connection Failed
1. Verify OpenStack is running:
   ```bash
   curl http://192.168.91.128/identity
   ```

2. Check backend logs:
   ```bash
   docker-compose logs backend | grep -i openstack
   ```

3. Verify .env settings match your OpenStack configuration

### Frontend Not Loading
```bash
# Check Nginx
docker-compose logs nginx

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up frontend
```

## Project Structure

```
PFE Portal/
├── backend/              # Flask API
├── frontend/             # React app
├── database/             # PostgreSQL schema
├── nginx/                # Reverse proxy config
├── prometheus/           # Metrics config
├── docker-compose.yml    # Container orchestration
├── .env                  # Environment variables
└── README.md            # Full documentation
```

## Documentation

- **README.md** - Full project documentation
- **DEPLOYMENT.md** - Production deployment guide
- **API_DOCUMENTATION.md** - Complete API reference
- **ARCHITECTURE.md** - System architecture overview

## Features at a Glance

✅ User authentication with JWT  
✅ VM lifecycle management  
✅ Real-time dashboard  
✅ Web terminal access  
✅ Console access (noVNC)  
✅ Prometheus monitoring  
✅ Activity logging  
✅ Modern responsive UI  
✅ Dark theme  
✅ Full Docker containerization  

## Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Portal | admin | admin123 |
| PostgreSQL | postgres | postgres |
| OpenStack | admin | pfestack26 |

**⚠️ Change these in production!**

## API Base URL
```
http://localhost/api
```

Example request:
```bash
# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get instances (requires token)
curl -X GET http://localhost/api/vms/instances \
  -H "Authorization: Bearer <token>"
```

## Next Steps

1. **Change passwords** for production
2. **Update environment variables** in `.env`
3. **Configure SSL/TLS** for HTTPS
4. **Set up monitoring alerts**
5. **Configure backups**
6. **Set up CI/CD pipeline**
7. **Review security settings**

## Support

For issues or questions, check:
- Docker logs: `docker-compose logs`
- Application logs: Inside containers in `/var/log/`
- API status: http://localhost/api/health
- Metrics: http://localhost:9090

## Performance Tips

1. Increase Flask workers for more concurrent requests:
   ```dockerfile
   CMD ["gunicorn", "--workers", "8", ...]
   ```

2. Add Redis caching for frequently accessed data

3. Use read replicas for database scaling

4. Enable gzip compression in Nginx (default: enabled)

5. Monitor with Prometheus and set up alerts

## Version

**VM Management Portal v1.0.0**

Built with React + Vite + Flask + PostgreSQL + Docker

Last Updated: 2024

---

**Ready to go!** Your VM management portal is now running.

Start with the dashboard at http://localhost and explore the features!
