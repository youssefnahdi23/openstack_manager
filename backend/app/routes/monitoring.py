from flask import Blueprint, jsonify
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST
import logging

from app.models.user import token_required
from app.utils.openstack import get_openstack_manager

bp = Blueprint('monitoring', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

# Prometheus metrics
login_counter = Counter('login_attempts', 'Total login attempts', ['status'])
vm_operations = Counter('vm_operations', 'Total VM operations', ['operation', 'status'])
api_requests = Counter('api_requests', 'Total API requests', ['endpoint', 'method', 'status'])

# Gauges for current state
active_instances = Gauge('active_instances', 'Number of active instances')
total_users = Gauge('total_users', 'Total users in system')
placement_cpu_total = Gauge('placement_cpu_total', 'Total CPU inventory available via Placement')
placement_cpu_used = Gauge('placement_cpu_used', 'Allocated CPU usage via Placement')
placement_ram_total_mb = Gauge('placement_ram_total_mb', 'Total RAM (MB) inventory available via Placement')
placement_ram_used_mb = Gauge('placement_ram_used_mb', 'Allocated RAM usage via Placement')
placement_disk_total_gb = Gauge('placement_disk_total_gb', 'Total disk (GB) inventory available via Placement')
placement_disk_used_gb = Gauge('placement_disk_used_gb', 'Allocated disk usage via Placement')


def _refresh_placement_metrics():
    try:
        manager = get_openstack_manager()
        placement_usage = manager.get_placement_usage()
        if placement_usage and placement_usage.get('totals'):
            totals = placement_usage['totals']
            placement_cpu_total.set(totals['cpu']['total'] or 0)
            placement_cpu_used.set(totals['cpu']['used'] or 0)
            placement_ram_total_mb.set(totals['ram']['total'] or 0)
            placement_ram_used_mb.set(totals['ram']['used'] or 0)
            placement_disk_total_gb.set(totals['disk']['total'] or 0)
            placement_disk_used_gb.set(totals['disk']['used'] or 0)
    except Exception as e:
        logger.warning(f'Unable to refresh placement metrics: {str(e)}')


@bp.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    try:
        _refresh_placement_metrics()
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


@bp.route('/placement/usage', methods=['GET'])
@token_required
def placement_usage(current_user):
    """Get Placement API resource usage summary"""
    try:
        manager = get_openstack_manager()
        usage = manager.get_placement_usage()
        if usage is None:
            usage = {
                'totals': {'cpu': {'total': 0, 'used': 0}, 'ram': {'total': 0, 'used': 0}, 'disk': {'total': 0, 'used': 0}},
                'providers': []
            }
        return jsonify(usage), 200
    except Exception as e:
        logger.error(f'Error getting placement usage: {str(e)}')
        return jsonify({
            'totals': {'cpu': {'total': 0, 'used': 0}, 'ram': {'total': 0, 'used': 0}, 'disk': {'total': 0, 'used': 0}},
            'providers': []
        }), 200
