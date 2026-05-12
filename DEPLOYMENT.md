# VM Management Portal - Docker Deployment Guide

## Prerequisites

- Docker & Docker Compose installed
- Docker daemon running
- OpenStack DevStack environment accessible at 192.168.91.128
- At least 4GB of available system memory
- 10GB of disk space

## Deployment Steps

### 1. Prepare Environment

```bash
cd "c:\Users\Youssef\Desktop\PFE Portal"

# Copy example environment file
copy .env.example .env

# Edit .env with your settings (optional - defaults are provided)
# nano .env
```

### 2. Update OpenStack Configuration

Edit `.env` and verify/update:

```env
OPENSTACK_AUTH_URL=http://192.168.91.128/identity
OPENSTACK_USERNAME=admin
OPENSTACK_PASSWORD=pfestack26
OPENSTACK_PROJECT_NAME=admin
OPENSTACK_REGION_NAME=RegionOne
```

### 3. Start Services

**Linux/macOS:**
```bash
bash startup.sh
```

**Windows (PowerShell):**
```powershell
.\startup.bat
```

**Manual (All platforms):**
```bash
docker-compose up --build -d
```

### 4. Wait for Services to Start

Services initialization may take 30-60 seconds:

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs backend
docker-compose logs frontend
```

### 5. Access the Application

| Service | URL |
|---------|-----|
| **Main Portal** | http://localhost |
| **API** | http://localhost/api |
| **Web Terminal** | http://localhost:7681 |
| **noVNC Console** | http://localhost:6080 |
| **Prometheus** | http://localhost:9090 |

### 6. Initial Login

```
Username: admin
Password: admin123
```

## Production Deployment

### Security Checklist

- [ ] Change default admin password
- [ ] Update SECRET_KEY and JWT_SECRET_KEY
- [ ] Configure HTTPS/SSL certificates
- [ ] Update nginx configuration for HTTPS
- [ ] Set FLASK_ENV=production
- [ ] Disable debug mode (FLASK_DEBUG=False)
- [ ] Set up firewall rules
- [ ] Enable rate limiting

### Generating Secure Keys

```bash
# Generate SECRET_KEY
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### Database Backup

```bash
# Backup PostgreSQL database
docker-compose exec -T db pg_dump -U postgres vm_portal > backup.sql

# Restore from backup
docker-compose exec -T db psql -U postgres vm_portal < backup.sql
```

### Enable HTTPS

1. Obtain SSL certificate (Let's Encrypt recommended)
2. Place certificates in `nginx/ssl/`
3. Update `nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of configuration
}
```

4. Rebuild and restart:
```bash
docker-compose down
docker-compose up --build -d
```

## Monitoring & Maintenance

### View Metrics

```bash
# Access Prometheus dashboard
# http://localhost:9090

# View backend metrics
curl http://localhost/api/metrics

# View system health
curl http://localhost/api/health
```

### Log Management

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100

# Save logs to file
docker-compose logs > logs.txt 2>&1
```

### Database Management

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres -d vm_portal

# List tables
\dt

# View users
SELECT * FROM users;

# View activity logs
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20;

# Exit
\q
```

### Update Services

```bash
# Update to latest images
docker-compose pull

# Rebuild and restart
docker-compose up --build -d

# Or rebuild without pulling
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Services Won't Start

1. Check Docker daemon:
```bash
docker ps
```

2. Check resource availability:
```bash
docker system df
```

3. View error logs:
```bash
docker-compose logs
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
docker-compose ps db

# Check logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### OpenStack Connection Issues

```bash
# Test connection to OpenStack
curl http://192.168.91.128/identity

# Check backend logs
docker-compose logs backend | grep -i openstack

# Verify environment variables
docker-compose exec backend env | grep OPENSTACK
```

### Frontend Not Loading

```bash
# Check Nginx logs
docker-compose logs nginx

# Verify frontend build
docker-compose logs frontend

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up frontend
```

### High Memory Usage

1. Check memory consumption:
```bash
docker stats
```

2. Reduce worker count in `backend/Dockerfile` or `gunicorn` command

3. Restart services:
```bash
docker-compose restart
```

## Performance Tuning

### Database

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM vm_logs ORDER BY created_at DESC LIMIT 20;

-- Vacuum database
VACUUM ANALYZE;
```

### Redis Caching

```bash
# Monitor Redis
docker-compose exec redis redis-cli INFO

# Clear cache
docker-compose exec redis redis-cli FLUSHALL
```

### Scaling

For production with many users:

1. Increase backend workers in `backend/Dockerfile`:
```dockerfile
CMD ["gunicorn", "--workers", "8", ...]
```

2. Use dedicated database server
3. Add load balancer
4. Implement horizontal scaling with orchestration (Kubernetes)

## Cleanup

### Stop Services

```bash
# Stop without removing
docker-compose stop

# Start again
docker-compose start

# Stop and remove
docker-compose down
```

### Remove All Data

```bash
# Remove containers and volumes (⚠️ deletes all data)
docker-compose down -v

# Remove unused images
docker image prune -a
```

## Next Steps

- Configure backups and disaster recovery
- Set up monitoring alerts
- Implement auto-scaling
- Add SSL/TLS certificates
- Configure centralized logging
