import os
from flask import Blueprint, request, jsonify
from app import db
from app.models.user import token_required, VMLog
from app.utils.openstack import get_openstack_manager
import logging

bp = Blueprint('vms', __name__, url_prefix='/api/vms')
logger = logging.getLogger(__name__)


def get_openstack_manager_for_request():
    project_name = request.headers.get('X-OpenStack-Project') or os.getenv('OPENSTACK_PROJECT_NAME', 'admin')
    return get_openstack_manager(project_name=project_name)


@bp.route('/instances', methods=['GET'])
@token_required
def list_instances(current_user):
    """List all instances"""
    try:
        manager = get_openstack_manager_for_request()
        instances = manager.list_instances()
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
        manager = get_openstack_manager_for_request()
        instance = manager.get_instance(instance_id)
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
        data = request.get_json() or {}
        
        if not data.get('name') or not data.get('flavor_id') or not data.get('image_id'):
            return jsonify({'message': 'Missing required fields'}), 400

        count = int(data.get('count', 1))
        assign_floating_ip = bool(data.get('assign_floating_ip', False))
        manager = get_openstack_manager_for_request()

        try:
            created_instances = manager.create_instances(
                name=data.get('name'),
                flavor_id=data.get('flavor_id'),
                image_id=data.get('image_id'),
                network_id=data.get('network_id'),
                count=count,
                assign_floating_ip=assign_floating_ip
            )

            vm_logs = []
            for instance in created_instances:
                vm_logs.append(VMLog(
                    user_id=current_user.id,
                    instance_id=instance.get('id', ''),
                    instance_name=instance.get('name'),
                    action='create',
                    status='success'
                ))

            db.session.add_all(vm_logs)
            db.session.commit()

            return jsonify({
                'message': 'Instance(s) created successfully',
                'instances': created_instances
            }), 201

        except Exception as e:
            failed_log = VMLog(
                user_id=current_user.id,
                instance_id='',
                instance_name=data.get('name'),
                action='create',
                status='failed',
                message=str(e)
            )
            db.session.add(failed_log)
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
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='delete',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            manager = get_openstack_manager_for_request()
            manager.delete_instance(instance_id)
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
            manager = get_openstack_manager_for_request()
            manager.start_instance(instance_id)
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
            manager = get_openstack_manager_for_request()
            manager.stop_instance(instance_id)
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
            manager = get_openstack_manager_for_request()
            manager.reboot_instance(instance_id, hard=hard_reboot)
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
        manager = get_openstack_manager_for_request()
        flavors = manager.list_flavors()
        return jsonify({'flavors': flavors}), 200
    
    except Exception as e:
        logger.error(f'Error listing flavors: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/images', methods=['GET'])
@token_required
def list_images(current_user):
    """List all images"""
    try:
        manager = get_openstack_manager_for_request()
        images = manager.list_images()
        return jsonify({'images': images}), 200
    
    except Exception as e:
        logger.error(f'Error listing images: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/networks', methods=['GET'])
@token_required
def list_networks(current_user):
    """List all networks"""
    try:
        manager = get_openstack_manager_for_request()
        networks = manager.list_networks()
        return jsonify({'networks': networks}), 200
    
    except Exception as e:
        logger.error(f'Error listing networks: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/projects', methods=['GET'])
def list_projects():
    """List all OpenStack projects using environment credentials"""
    try:
        manager = get_openstack_manager()
        projects = manager.list_projects()
        return jsonify({'projects': projects}), 200
    except Exception as e:
        logger.error(f'Error listing projects: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/console', methods=['GET'])
@token_required
def get_console(current_user, instance_id):
    """Get console URL for an instance"""
    try:
        manager = get_openstack_manager_for_request()
        console_url = manager.get_vnc_console(instance_id) or manager.vnc_base_url
        return jsonify({
            'console_url': console_url,
            'vnc_url': manager.vnc_base_url
        }), 200
    
    except Exception as e:
        logger.error(f'Error getting console: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    """Get OpenStack statistics"""
    try:
        manager = get_openstack_manager_for_request()
        stats = manager.get_stats()
        return jsonify({'stats': stats}), 200
    
    except Exception as e:
        logger.error(f'Error getting stats: {str(e)}')
        return jsonify({'message': str(e)}), 500
