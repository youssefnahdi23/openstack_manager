# VM Management Portal - API Documentation

## Base URL

```
http://localhost/api
```

All requests must include the `Authorization` header with a Bearer token (except `/auth/login`):

```
Authorization: Bearer <jwt_token>
```

## Response Format

All responses are in JSON format:

### Success Response
```json
{
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "message": "Error message"
}
```

## Authentication Endpoints

### Login
Authenticate with username and password.

- **URL:** `/auth/login`
- **Method:** `POST`
- **Auth Required:** No

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00"
  }
}
```

**Error Response (401):**
```json
{
  "message": "Invalid username or password"
}
```

### Logout
Logout and invalidate token.

- **URL:** `/auth/logout`
- **Method:** `POST`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "message": "Logout successful"
}
```

### Get Current User
Retrieve authenticated user information.

- **URL:** `/auth/current-user`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00"
  }
}
```

### Verify Token
Verify if token is valid and get user info.

- **URL:** `/auth/verify-token`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00"
  }
}
```

## VM Management Endpoints

### List Instances
Get all virtual machine instances.

- **URL:** `/vms/instances`
- **Method:** `GET`
- **Auth Required:** Yes

**Query Parameters:**
- None

**Success Response (200):**
```json
{
  "instances": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "web-server-1",
      "status": "ACTIVE",
      "created": "2024-01-15T10:00:00",
      "updated": "2024-01-15T10:05:00",
      "flavor": "2",
      "image": "3",
      "addresses": {
        "private": [
          {
            "version": 4,
            "addr": "192.168.1.10"
          }
        ]
      },
      "metadata": {}
    }
  ]
}
```

### Get Instance Details
Get detailed information about a specific instance.

- **URL:** `/vms/instances/<instance_id>`
- **Method:** `GET`
- **Auth Required:** Yes

**URL Parameters:**
- `instance_id` (string) - The instance ID

**Success Response (200):**
```json
{
  "instance": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "web-server-1",
    "status": "ACTIVE",
    ...
  }
}
```

**Error Response (404):**
```json
{
  "message": "Instance not found"
}
```

### Create Instance
Create a new virtual machine instance.

- **URL:** `/vms/instances`
- **Method:** `POST`
- **Auth Required:** Yes

**Request Body:**
```json
{
  "name": "new-server",
  "flavor_id": "2",
  "image_id": "3",
  "network_id": "net-123" // Optional
}
```

**Success Response (201):**
```json
{
  "message": "Instance created successfully",
  "instance": {
    "id": "new-instance-id",
    "name": "new-server",
    "status": "BUILD"
  }
}
```

**Error Response (400):**
```json
{
  "message": "Missing required fields"
}
```

### Delete Instance
Delete a virtual machine instance.

- **URL:** `/vms/instances/<instance_id>`
- **Method:** `DELETE`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "message": "Instance deleted successfully"
}
```

### Start Instance
Start a stopped instance.

- **URL:** `/vms/instances/<instance_id>/start`
- **Method:** `POST`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "message": "Instance started successfully"
}
```

### Stop Instance
Stop a running instance.

- **URL:** `/vms/instances/<instance_id>/stop`
- **Method:** `POST`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "message": "Instance stopped successfully"
}
```

### Reboot Instance
Reboot an instance.

- **URL:** `/vms/instances/<instance_id>/reboot`
- **Method:** `POST`
- **Auth Required:** Yes

**Request Body:**
```json
{
  "hard": false // Optional: true for hard reboot, false for soft reboot
}
```

**Success Response (200):**
```json
{
  "message": "Instance rebooted successfully"
}
```

## Resources Endpoints

### List Flavors
Get all available instance flavors (sizes).

- **URL:** `/vms/flavors`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "flavors": [
    {
      "id": "1",
      "name": "m1.tiny",
      "vcpus": 1,
      "ram": 512,
      "disk": 1,
      "swap": 0,
      "ephemeral": 0,
      "is_public": true
    },
    {
      "id": "2",
      "name": "m1.small",
      "vcpus": 1,
      "ram": 2048,
      "disk": 20,
      "swap": 0,
      "ephemeral": 0,
      "is_public": true
    }
  ]
}
```

### List Images
Get all available operating system images.

- **URL:** `/vms/images`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "images": [
    {
      "id": "3",
      "name": "Ubuntu 20.04",
      "status": "active",
      "size": 424673280,
      "disk_format": "qcow2",
      "container_format": "bare",
      "created_at": "2024-01-01T00:00:00"
    }
  ]
}
```

### List Networks
Get all available networks.

- **URL:** `/vms/networks`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "networks": [
    {
      "id": "net-123",
      "name": "private",
      "status": "ACTIVE",
      "admin_state_up": true,
      "shared": false,
      "external": false
    }
  ]
}
```

## Console Endpoints

### Get Console URL
Get VNC console URL for an instance.

- **URL:** `/vms/instances/<instance_id>/console`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "console_url": "wss://...",
  "vnc_url": "http://localhost:6080/vnc.html"
}
```

## Statistics Endpoints

### Get Statistics
Get VM management statistics.

- **URL:** `/vms/stats`
- **Method:** `GET`
- **Auth Required:** Yes

**Success Response (200):**
```json
{
  "stats": {
    "total_instances": 5,
    "running_instances": 3,
    "stopped_instances": 2,
    "total_flavors": 5,
    "total_images": 3,
    "total_networks": 2
  }
}
```

## Health & Monitoring Endpoints

### Health Check
Check application and OpenStack connection status.

- **URL:** `/health`
- **Method:** `GET`
- **Auth Required:** No

**Success Response (200):**
```json
{
  "status": "healthy",
  "openstack_connected": true
}
```

### Prometheus Metrics
Get Prometheus metrics for monitoring.

- **URL:** `/metrics`
- **Method:** `GET`
- **Auth Required:** No

**Success Response (200):**
Plain text Prometheus format metrics.

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Permission denied |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

## Rate Limiting

No rate limiting is currently implemented. For production, consider adding rate limiting middleware.

## Pagination

Pagination is not currently implemented. For large datasets, consider adding pagination support.

## Filtering

Basic filtering is supported via query parameters on list endpoints:
- Not currently implemented in v1

## Sorting

Sorting is not currently implemented. Consider adding sort parameters.

## Examples

### JavaScript/Axios

```javascript
import axios from 'axios'

const API_BASE = 'http://localhost/api'

// Login
const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
  username: 'admin',
  password: 'admin123'
})

const token = loginResponse.data.token

// Create request config with auth
const config = {
  headers: {
    Authorization: `Bearer ${token}`
  }
}

// List instances
const instances = await axios.get(`${API_BASE}/vms/instances`, config)

// Create instance
const newInstance = await axios.post(`${API_BASE}/vms/instances`, {
  name: 'my-server',
  flavor_id: '2',
  image_id: '3'
}, config)

// Start instance
await axios.post(`${API_BASE}/vms/instances/123/start`, {}, config)
```

### cURL

```bash
# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# List instances
curl -X GET http://localhost/api/vms/instances \
  -H "Authorization: Bearer <token>"

# Create instance
curl -X POST http://localhost/api/vms/instances \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-server",
    "flavor_id": "2",
    "image_id": "3"
  }'
```

## Changelog

### v1.0.0 (2024)
- Initial release
- Authentication with JWT tokens
- VM management (list, create, delete, start, stop, reboot)
- Resource browsing (flavors, images, networks)
- Console access
- Statistics and monitoring
- Health checks
