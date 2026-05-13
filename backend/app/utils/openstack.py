import os
from openstack import connect
import logging

logger = logging.getLogger(__name__)


class OpenStackManager:
    """Manager for OpenStack operations"""

    def __init__(self):
        self.auth_url = os.getenv('OPENSTACK_AUTH_URL', 'http://192.168.91.128/identity')
        self.username = os.getenv('OPENSTACK_USERNAME', 'admin')
        self.password = os.getenv('OPENSTACK_PASSWORD', 'pfestack26')
        self.project_name = os.getenv('OPENSTACK_PROJECT_NAME', 'admin')
        self.user_domain_name = os.getenv('OPENSTACK_USER_DOMAIN_NAME', 'Default')
        self.project_domain_name = os.getenv('OPENSTACK_PROJECT_DOMAIN_NAME', 'Default')
        self.region_name = os.getenv('OPENSTACK_REGION_NAME', 'RegionOne')

        self.conn = None
        self._connect()

    def _connect(self):
        """Establish connection to OpenStack"""
        try:
            self.conn = connect(
                auth_url=self.auth_url,
                username=self.username,
                password=self.password,
                project_name=self.project_name,
                user_domain_name=self.user_domain_name,
                project_domain_name=self.project_domain_name,
                region_name=self.region_name
            )
            logger.info("Successfully connected to OpenStack")
        except Exception as e:
            logger.error(f"Failed to connect to OpenStack: {e}")
            self.conn = None
            config.set_override('project_name', self.project_name)
            config.set_override('user_domain_name', self.user_domain_name)
            config.set_override('project_domain_name', self.project_domain_name)
            config.set_override('region_name', self.region_name)
            config.set_override('interface', 'public')
            
            self.conn = connect(config=config)
            logger.info('Connected to OpenStack successfully')
        except Exception as e:
            logger.error(f'Failed to connect to OpenStack: {str(e)}')
            self.conn = None
    
    def list_instances(self):
        """List all instances"""
        try:
            if not self.conn:
                return []
            
            instances = []
            for server in self.conn.compute.servers():
                instances.append({
                    'id': server.id,
                    'name': server.name,
                    'status': server.status,
                    'created': server.created_at,
                    'updated': server.updated_at,
                    'flavor': server.flavor.get('id') if server.flavor else None,
                    'image': server.image.get('id') if server.image else None,
                    'addresses': server.addresses,
                    'metadata': server.metadata
                })
            return instances
        except Exception as e:
            logger.error(f'Error listing instances: {str(e)}')
            return []
    
    def get_instance(self, instance_id):
        """Get instance details"""
        try:
            if not self.conn:
                return None
            
            server = self.conn.compute.get_server(instance_id)
            if server:
                return {
                    'id': server.id,
                    'name': server.name,
                    'status': server.status,
                    'created': server.created_at,
                    'updated': server.updated_at,
                    'flavor': server.flavor,
                    'image': server.image,
                    'addresses': server.addresses,
                    'metadata': server.metadata,
                    'security_groups': server.security_groups
                }
            return None
        except Exception as e:
            logger.error(f'Error getting instance: {str(e)}')
            return None
    
    def create_instance(self, name, flavor_id, image_id, network_id=None, **kwargs):
        """Create a new instance"""
        try:
            if not self.conn:
                return None
            
            # Get flavor and image objects
            flavor = self.conn.compute.get_flavor(flavor_id)
            image = self.conn.image.get_image(image_id)
            
            # Create server
            server = self.conn.compute.create_server(
                name=name,
                flavor_id=flavor_id,
                image_id=image_id,
                networks=[{'uuid': network_id}] if network_id else [],
                **kwargs
            )
            
            return {
                'id': server.id,
                'name': server.name,
                'status': server.status
            }
        except Exception as e:
            logger.error(f'Error creating instance: {str(e)}')
            raise e
    
    def delete_instance(self, instance_id):
        """Delete an instance"""
        try:
            if not self.conn:
                return False
            
            self.conn.compute.delete_server(instance_id, force=True)
            return True
        except Exception as e:
            logger.error(f'Error deleting instance: {str(e)}')
            raise e
    
    def start_instance(self, instance_id):
        """Start a stopped instance"""
        try:
            if not self.conn:
                return False
            
            self.conn.compute.start_server(instance_id)
            return True
        except Exception as e:
            logger.error(f'Error starting instance: {str(e)}')
            raise e
    
    def stop_instance(self, instance_id):
        """Stop a running instance"""
        try:
            if not self.conn:
                return False
            
            self.conn.compute.stop_server(instance_id)
            return True
        except Exception as e:
            logger.error(f'Error stopping instance: {str(e)}')
            raise e
    
    def reboot_instance(self, instance_id, hard=False):
        """Reboot an instance"""
        try:
            if not self.conn:
                return False
            
            reboot_type = 'HARD' if hard else 'SOFT'
            self.conn.compute.reboot_server(instance_id, reboot_type=reboot_type)
            return True
        except Exception as e:
            logger.error(f'Error rebooting instance: {str(e)}')
            raise e
    
    def list_flavors(self):
        """List all flavors"""
        try:
            if not self.conn:
                return []
            
            flavors = []
            for flavor in self.conn.compute.flavors():
                flavors.append({
                    'id': flavor.id,
                    'name': flavor.name,
                    'vcpus': flavor.vcpus,
                    'ram': flavor.ram,
                    'disk': flavor.disk,
                    'swap': flavor.swap,
                    'ephemeral': flavor.ephemeral,
                    'is_public': flavor.is_public
                })
            return flavors
        except Exception as e:
            logger.error(f'Error listing flavors: {str(e)}')
            return []
    
    def list_images(self):
        """List all images"""
        try:
            if not self.conn:
                return []
            
            images = []
            for image in self.conn.image.images():
                if image.status == 'active':
                    images.append({
                        'id': image.id,
                        'name': image.name,
                        'status': image.status,
                        'size': image.size,
                        'disk_format': image.disk_format,
                        'container_format': image.container_format,
                        'created_at': image.created_at
                    })
            return images
        except Exception as e:
            logger.error(f'Error listing images: {str(e)}')
            return []
    
    def list_networks(self):
        """List all networks"""
        try:
            if not self.conn:
                return []
            
            networks = []
            for network in self.conn.network.networks():
                networks.append({
                    'id': network.id,
                    'name': network.name,
                    'status': network.status,
                    'admin_state_up': network.admin_state_up,
                    'shared': network.is_shared,
                    'external': network.is_router_external
                })
            return networks
        except Exception as e:
            logger.error(f'Error listing networks: {str(e)}')
            return []
    
    def get_console_url(self, instance_id, console_type='novnc'):
        """Get console URL for an instance"""
        try:
            if not self.conn:
                return None
            
            # Get the console URL
            console = self.conn.compute.create_server_console(
                instance_id,
                console_type
            )
            
            return console.get('console', {}).get('url')
        except Exception as e:
            logger.error(f'Error getting console URL: {str(e)}')
            return None
    
    def get_vnc_console(self, instance_id):
        """Get VNC console for an instance"""
        try:
            if not self.conn:
                return None
            
            # Create VNC console
            result = self.conn.compute.create_server_console(instance_id, 'novnc')
            return result.get('console', {}).get('url')
        except Exception as e:
            logger.error(f'Error getting VNC console: {str(e)}')
            return None
    
    def is_connected(self):
        """Check if connected to OpenStack"""
        return self.conn is not None
    
    def get_stats(self):
        """Get OpenStack statistics"""
        try:
            if not self.conn:
                return {
                    'total_instances': 0,
                    'running_instances': 0,
                    'stopped_instances': 0,
                    'total_flavors': 0,
                    'total_images': 0,
                    'total_networks': 0
                }
            
            instances = list(self.conn.compute.servers())
            
            return {
                'total_instances': len(instances),
                'running_instances': len([i for i in instances if i.status == 'ACTIVE']),
                'stopped_instances': len([i for i in instances if i.status == 'STOPPED']),
                'total_flavors': len(list(self.conn.compute.flavors())),
                'total_images': len(list(self.conn.image.images())),
                'total_networks': len(list(self.conn.network.networks()))
            }
        except Exception as e:
            logger.error(f'Error getting stats: {str(e)}')
            return {
                'total_instances': 0,
                'running_instances': 0,
                'stopped_instances': 0,
                'total_flavors': 0,
                'total_images': 0,
                'total_networks': 0
            }


# Global instance
_openstack_manager = None


def get_openstack_manager():
    """Get or create OpenStack manager instance"""
    global _openstack_manager
    if _openstack_manager is None:
        _openstack_manager = OpenStackManager()
    return _openstack_manager
