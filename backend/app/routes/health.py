from flask import Blueprint, jsonify
from app.utils.openstack import get_openstack_manager
import logging

bp = Blueprint('health', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

os_manager = get_openstack_manager()


@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        is_connected = os_manager.is_connected()
        return jsonify({
            'status': 'healthy',
            'openstack_connected': is_connected
        }), 200
    
    except Exception as e:
        logger.error(f'Health check error: {str(e)}')
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
