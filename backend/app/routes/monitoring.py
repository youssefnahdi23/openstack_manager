from flask import Blueprint, jsonify
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST
import logging

bp = Blueprint('monitoring', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

# Prometheus metrics
login_counter = Counter('login_attempts', 'Total login attempts', ['status'])
vm_operations = Counter('vm_operations', 'Total VM operations', ['operation', 'status'])
api_requests = Counter('api_requests', 'Total API requests', ['endpoint', 'method', 'status'])

# Gauges for current state
active_instances = Gauge('active_instances', 'Number of active instances')
total_users = Gauge('total_users', 'Total users in system')


@bp.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    try:
        return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}
    except Exception as e:
        logger.error(f'Error generating metrics: {str(e)}')
        return jsonify({'message': str(e)}), 500


def record_login_attempt(success):
    """Record login attempt metric"""
    status = 'success' if success else 'failed'
    login_counter.labels(status=status).inc()


def record_vm_operation(operation, success):
    """Record VM operation metric"""
    status = 'success' if success else 'failed'
    vm_operations.labels(operation=operation, status=status).inc()


def record_api_request(endpoint, method, status_code):
    """Record API request metric"""
    status = 'success' if 200 <= status_code < 300 else 'error'
    api_requests.labels(endpoint=endpoint, method=method, status=status).inc()


def set_active_instances(count):
    """Set active instances gauge"""
    active_instances.set(count)


def set_total_users(count):
    """Set total users gauge"""
    total_users.set(count)
