from flask import Blueprint, jsonify
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.utils.openstack import get_openstack_manager
import logging

bp = Blueprint('health', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

os_manager = get_openstack_manager()


@bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        openstack_connected = os_manager.is_connected()
        database_connected = True
        database_error = None

        try:
            db.session.execute(text('SELECT 1'))
            database_connected = True
        except SQLAlchemyError as db_exc:
            database_connected = False
            database_error = str(db_exc)
        finally:
            try:
                db.session.rollback()
            except Exception:
                pass

        status = 'healthy' if openstack_connected and database_connected else 'unhealthy'
        payload = {
            'status': status,
            'openstack_connected': openstack_connected,
            'database_connected': database_connected,
        }

        if database_error:
            payload['database_error'] = database_error

        return jsonify(payload), (200 if status == 'healthy' else 503)

    except Exception as e:
        logger.error(f'Health check error: {str(e)}')
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
