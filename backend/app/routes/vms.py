from flask import Blueprint, request, jsonify
from app import db
from app.models.user import token_required, VMLog
from app.utils.openstack import get_openstack_manager
import logging

bp = Blueprint('vms', __name__, url_prefix='/api/vms')
logger = logging.getLogger(__name__)

os_manager = get_openstack_manager()


@bp.route('/instances', methods=['GET'])
@token_required
def list_instances(current_user):
    """List all instances"""
    try:
        instances = os_manager.list_instances()
        return jsonify({
            'instances': instances
        }), 200
    
    except Exception as e:
        logger.error(f'Error listing instances: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>', methods=['GET'])
@token_required
def get_instance(current_user, instance_id):
    """Get instance details"""
    try:
        instance = os_manager.get_instance(instance_id)
        if not instance:
            return jsonify({'message': 'Instance not found'}), 404
        
        return jsonify({'instance': instance}), 200
    
    except Exception as e:
        logger.error(f'Error getting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances', methods=['POST'])
@token_required
def create_instance(current_user):
    """Create a new instance"""
    try:
        data = request.get_json()
        
        if not data or not data.get('name') or not data.get('flavor_id') or not data.get('image_id'):
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Create VM log
        vm_log = VMLog(
            user_id=current_user.id,
            instance_name=data.get('name'),
            action='create',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            result = os_manager.create_instance(
                name=data.get('name'),
                flavor_id=data.get('flavor_id'),
                image_id=data.get('image_id'),
                network_id=data.get('network_id')
            )
            
            vm_log.instance_id = result['id']
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({
                'message': 'Instance created successfully',
                'instance': result
            }), 201
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error creating instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>', methods=['DELETE'])
@token_required
def delete_instance(current_user, instance_id):
    """Delete an instance"""
    try:
        # Create VM log
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='delete',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            os_manager.delete_instance(instance_id)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance deleted successfully'}), 200
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error deleting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/start', methods=['POST'])
@token_required
def start_instance(current_user, instance_id):
    """Start a stopped instance"""
    try:
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='start',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            os_manager.start_instance(instance_id)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance started successfully'}), 200
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error starting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/stop', methods=['POST'])
@token_required
def stop_instance(current_user, instance_id):
    """Stop a running instance"""
    try:
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='stop',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            os_manager.stop_instance(instance_id)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance stopped successfully'}), 200
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error stopping instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/reboot', methods=['POST'])
@token_required
def reboot_instance(current_user, instance_id):
    """Reboot an instance"""
    try:
        data = request.get_json() or {}
        hard_reboot = data.get('hard', False)
        
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='reboot',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            os_manager.reboot_instance(instance_id, hard=hard_reboot)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance rebooted successfully'}), 200
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error rebooting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/flavors', methods=['GET'])
@token_required
def list_flavors(current_user):
    """List all flavors"""
    try:
        flavors = os_manager.list_flavors()
        return jsonify({'flavors': flavors}), 200
    
    except Exception as e:
        logger.error(f'Error listing flavors: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/images', methods=['GET'])
@token_required
def list_images(current_user):
    """List all images"""
    try:
        images = os_manager.list_images()
        return jsonify({'images': images}), 200
    
    except Exception as e:
        logger.error(f'Error listing images: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/networks', methods=['GET'])
@token_required
def list_networks(current_user):
    """List all networks"""
    try:
        networks = os_manager.list_networks()
        return jsonify({'networks': networks}), 200
    
    except Exception as e:
        logger.error(f'Error listing networks: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/console', methods=['GET'])
@token_required
def get_console(current_user, instance_id):
    """Get console URL for an instance"""
    try:
        console_url = os_manager.get_vnc_console(instance_id)
        return jsonify({
            'console_url': console_url,
            'vnc_url': 'http://localhost:6080/vnc.html'
        }), 200
    
    except Exception as e:
        logger.error(f'Error getting console: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    """Get OpenStack statistics"""
    try:
        stats = os_manager.get_stats()
        return jsonify({'stats': stats}), 200
    
    except Exception as e:
        logger.error(f'Error getting stats: {str(e)}')
        return jsonify({'message': str(e)}), 500
