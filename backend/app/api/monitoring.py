from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from ..services.monitoring_service import MonitoringService
import logging

monitoring_bp = Blueprint('monitoring', __name__)
logger = logging.getLogger(__name__)

@monitoring_bp.route('/system', methods=['GET'])
@jwt_required()
def system_metrics():
    try:
        metrics = MonitoringService.get_system_metrics()
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route('/services', methods=['GET'])
@jwt_required()
def services_status():
    try:
        services = MonitoringService.get_openstack_services_status()
        return jsonify(services)
    except Exception as e:
        logger.error(f"Error getting services status: {e}")
        return jsonify({"error": str(e)}), 500

@monitoring_bp.route('/instance/<instance_ip>', methods=['GET'])
@jwt_required()
def instance_metrics(instance_ip):
    try:
        metrics = MonitoringService.get_instance_metrics(instance_ip)
        return jsonify(metrics)
    except Exception as e:
        logger.error(f"Error getting instance metrics: {e}")
        return jsonify({"error": str(e)}), 500