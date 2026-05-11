from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..services.openstack_service import OpenStackService
import logging

instances_bp = Blueprint('instances', __name__)
logger = logging.getLogger(__name__)
openstack_service = OpenStackService()

@instances_bp.route('/', methods=['GET'])
@jwt_required()
def list_instances():
    try:
        instances = openstack_service.list_instances()
        return jsonify({"instances": instances, "count": len(instances)})
    except Exception as e:
        logger.error(f"Error in list_instances: {e}")
        return jsonify({"error": str(e)}), 500

@instances_bp.route('/<instance_id>', methods=['GET'])
@jwt_required()
def get_instance(instance_id):
    try:
        instance = openstack_service.get_instance(instance_id)
        return jsonify(instance)
    except Exception as e:
        logger.error(f"Error in get_instance: {e}")
        return jsonify({"error": str(e)}), 500

@instances_bp.route('/', methods=['POST'])
@jwt_required()
def create_instance():
    try:
        data = request.get_json()
        instance = openstack_service.create_instance(
            name=data['name'],
            image_id=data['image_id'],
            flavor_id=data['flavor_id'],
            network_id=data['network_id'],
            key_name=data.get('key_name'),
            security_groups=data.get('security_groups')
        )
        return jsonify(instance), 201
    except Exception as e:
        logger.error(f"Error in create_instance: {e}")
        return jsonify({"error": str(e)}), 500

@instances_bp.route('/<instance_id>', methods=['DELETE'])
@jwt_required()
def delete_instance(instance_id):
    try:
        result = openstack_service.delete_instance(instance_id)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in delete_instance: {e}")
        return jsonify({"error": str(e)}), 500

@instances_bp.route('/<instance_id>/<action>', methods=['POST'])
@jwt_required()
def instance_action(instance_id, action):
    try:
        result = openstack_service.perform_instance_action(instance_id, action)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in instance_action: {e}")
        return jsonify({"error": str(e)}), 500

@instances_bp.route('/images', methods=['GET'])
@jwt_required()
def list_images():
    try:
        images = openstack_service.list_images()
        return jsonify({"images": images})
    except Exception as e:
        logger.error(f"Error listing images: {e}")
        return jsonify({"error": str(e)}), 500

@instances_bp.route('/flavors', methods=['GET'])
@jwt_required()
def list_flavors():
    try:
        flavors = openstack_service.list_flavors()
        return jsonify({"flavors": flavors})
    except Exception as e:
        logger.error(f"Error listing flavors: {e}")
        return jsonify({"error": str(e)}), 500

@instances_bp.route('/networks', methods=['GET'])
@jwt_required()
def list_networks():
    try:
        networks = openstack_service.list_networks()
        return jsonify({"networks": networks})
    except Exception as e:
        logger.error(f"Error listing networks: {e}")
        return jsonify({"error": str(e)}), 500