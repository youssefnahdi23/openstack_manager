import os
from openstack import connect, config as openstack_config
import logging

logger = logging.getLogger(__name__)


class OpenStackManager:
    """Manager for OpenStack operations"""

    def __init__(
        self,
        auth_url=None,
        username=None,
        password=None,
        project_name=None,
        user_domain_name=None,
        project_domain_name=None,
        region_name=None,
    ):
        self.auth_url = auth_url or os.getenv('OPENSTACK_AUTH_URL', 'http://192.168.91.128/identity')
        self.username = username or os.getenv('OPENSTACK_USERNAME', 'admin')
        self.password = password or os.getenv('OPENSTACK_PASSWORD', 'pfestack26')
        self.project_name = project_name or os.getenv('OPENSTACK_PROJECT_NAME', 'admin')
        self.user_domain_name = user_domain_name or os.getenv('OPENSTACK_USER_DOMAIN_NAME', 'Default')
        self.project_domain_name = project_domain_name or os.getenv('OPENSTACK_PROJECT_DOMAIN_NAME', 'Default')
        self.region_name = region_name or os.getenv('OPENSTACK_REGION_NAME', 'RegionOne')
        self.vnc_base_url = os.getenv('VNC_BASE_URL', 'http://localhost:6080/vnc.html')

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
            try:
                openstack_config.set_override('project_name', self.project_name)
                openstack_config.set_override('user_domain_name', self.user_domain_name)
                openstack_config.set_override('project_domain_name', self.project_domain_name)
                openstack_config.set_override('region_name', self.region_name)
                openstack_config.set_override('interface', 'public')
                self.conn = connect(config=openstack_config)
                logger.info('Connected to OpenStack successfully')
            except Exception as inner_e:
                logger.error(f'Failed fallback OpenStack connection: {inner_e}')
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
    
    def _is_external_network(self, network):
        return any([
            getattr(network, 'is_router_external', False),
            getattr(network, 'router_external', False),
            getattr(network, 'external', False),
            getattr(network, 'is_external', False),
        ])

    def _is_shared_network(self, network):
        return any([
            getattr(network, 'is_shared', False),
            getattr(network, 'shared', False),
        ])

    def _get_default_network_id(self):
        """Return the best available private network ID.

        Preference order:
        1. Private networks with a subnet in the 10.0.0.0/8 range
        2. Any private network
        3. Any non-external network
        """
        try:
            networks = self.list_networks()

            # 1) Prefer private networks that have a 10.* subnet
            for net in networks:
                if net.get('private'):
                    for subnet in net.get('subnets', []):
                        cidr = subnet.get('cidr') or ''
                        if cidr.startswith('10.'):
                            return net.get('id')

            # 2) Next prefer any private network
            for net in networks:
                if net.get('private'):
                    return net.get('id')

            # 3) Fall back to any non-external network
            for net in networks:
                if not net.get('external'):
                    return net.get('id')
        except Exception as e:
            logger.error(f'Error finding default network: {str(e)}')
        return None

    def _get_floating_ip_from_addresses(self, addresses):
        """Extract the first floating IP from OpenStack addresses."""
        if not addresses:
            return None

        if isinstance(addresses, dict):
            for network_name, addr_list in addresses.items():
                if not isinstance(addr_list, list):
                    continue
                for addr in addr_list:
                    if addr.get('OS-EXT-IPS:type') == 'floating' or addr.get('type') == 'floating':
                        return addr.get('addr')
                    if addr.get('floating_ip_address'):
                        return addr.get('floating_ip_address')
        return None

    def create_instance(self, name, flavor_id, image_id, network_ids=None, **kwargs):
        """Create a new instance"""
        try:
            if not self.conn:
                return None
            
            # Get flavor and image objects
            flavor = self.conn.compute.get_flavor(flavor_id)
            image = self.conn.image.get_image(image_id)
            
            if not network_ids:
                default_network = self._get_default_network_id()
                if not default_network:
                    raise ValueError('No network selected and no default network is available')
                network_ids = [default_network]
            
            server = self.conn.compute.create_server(
                name=name,
                flavor_id=flavor_id,
                image_id=image_id,
                networks=[{'uuid': net_id} for net_id in network_ids if net_id],
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

    def list_projects(self):
        """List all available OpenStack projects"""
        try:
            if not self.conn:
                return []

            projects = []
            for project in self.conn.identity.projects():
                projects.append({
                    'id': project.id,
                    'name': project.name,
                    'domain_id': getattr(project, 'domain_id', None),
                    'enabled': getattr(project, 'enabled', True)
                })
            return projects
        except Exception as e:
            logger.error(f'Error listing projects: {str(e)}')
            return []

    def allocate_floating_ip(self, server):
        """Allocate a floating IP and attach it to the server"""
        try:
            if not self.conn:
                return None

            external_networks = [
                network for network in self.conn.network.networks()
                if getattr(network, 'is_router_external', False)
            ]
            if not external_networks:
                return None

            external_network = external_networks[0]
            ports = list(self.conn.network.ports(device_id=server.id))
            if not ports:
                return None

            port = ports[0]
            floating_ip = self.conn.network.create_ip(
                floating_network_id=external_network.id,
                port_id=port.id
            )
            return getattr(floating_ip, 'floating_ip_address', None) or floating_ip.get('floating_ip_address')
        except Exception as e:
            logger.error(f'Error allocating floating IP: {str(e)}')
            return None

    def _get_default_keypair_name(self):
        """Return the single available keypair name if only one exists."""
        try:
            keypairs = list(self.conn.compute.keypairs())
            if len(keypairs) == 1:
                return keypairs[0].name
        except Exception as e:
            logger.error(f'Error listing keypairs: {str(e)}')
        return None

    def list_keypairs(self):
        """List available keypairs."""
        try:
            if not self.conn:
                return []

            keypairs = []
            for keypair in self.conn.compute.keypairs():
                keypairs.append({
                    'name': keypair.name,
                    'fingerprint': getattr(keypair, 'fingerprint', None)
                })
            return keypairs
        except Exception as e:
            logger.error(f'Error listing keypairs: {str(e)}')
            return []

    def create_instances(self, name, flavor_id, image_id, network_ids=None, count=1, assign_floating_ip=False, key_name=None, **kwargs):
        """Create one or more new instances"""
        try:
            if not self.conn:
                return []

            if not network_ids:
                default_network = self._get_default_network_id()
                if not default_network:
                    raise ValueError('No network selected and no default network is available')
                network_ids = [default_network]

            if not key_name:
                key_name = self._get_default_keypair_name()

            instances = []
            for idx in range(max(1, int(count))):
                server_name = name if int(count) == 1 else f"{name}-{idx + 1}"
                create_kwargs = {
                    'name': server_name,
                    'flavor_id': flavor_id,
                    'image_id': image_id,
                    'networks': [{'uuid': net_id} for net_id in network_ids if net_id],
                }
                if key_name:
                    create_kwargs['key_name'] = key_name
                create_kwargs.update(kwargs)

                server = self.conn.compute.create_server(**create_kwargs)

                try:
                    server = self.conn.compute.wait_for_server(server, status='ACTIVE', failures=['ERROR'], interval=3, wait=120)
                except Exception:
                    # Continue even if waiting fails; server object still contains an ID
                    pass

                instance_data = {
                    'id': server.id,
                    'name': server.name,
                    'status': getattr(server, 'status', None),
                }

                if assign_floating_ip:
                    floating_ip = self.allocate_floating_ip(server)
                    instance_data['floating_ip'] = floating_ip

                instances.append(instance_data)

            return instances
        except Exception as e:
            logger.error(f'Error creating instances: {str(e)}')
            raise e

    def list_networks(self):
        """List all networks with subnet details."""
        try:
            if not self.conn:
                return []

            networks = []
            for network in self.conn.network.networks():
                external = self._is_external_network(network)
                shared = self._is_shared_network(network)
                subnets = []
                try:
                    for subnet in self.conn.network.subnets(network_id=network.id):
                        subnets.append({
                            'id': subnet.id,
                            'name': getattr(subnet, 'name', None),
                            'cidr': getattr(subnet, 'cidr', None),
                            'ip_version': getattr(subnet, 'ip_version', None),
                            'gateway_ip': getattr(subnet, 'gateway_ip', None),
                        })
                except Exception as e:
                    logger.warning(f'Error loading subnets for network {network.id}: {e}')

                networks.append({
                    'id': network.id,
                    'name': network.name,
                    'status': getattr(network, 'status', None),
                    'admin_state_up': getattr(network, 'admin_state_up', None),
                    'shared': shared,
                    'external': external,
                    'private': not external and not shared,
                    'project_id': getattr(network, 'project_id', None) or getattr(network, 'tenant_id', None),
                    'provider_network_type': getattr(network, 'provider_network_type', None),
                    'provider_physical_network': getattr(network, 'provider_physical_network', None),
                    'provider_segmentation_id': getattr(network, 'provider_segmentation_id', None),
                    'subnets': subnets,
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


def get_openstack_manager(
    project_name=None,
    user_domain_name=None,
    project_domain_name=None,
    username=None,
    password=None,
    auth_url=None,
    region_name=None,
):
    """Get or create OpenStack manager instance"""
    global _openstack_manager
    if project_name or user_domain_name or project_domain_name or username or password or auth_url or region_name:
        return OpenStackManager(
            auth_url=auth_url,
            username=username,
            password=password,
            project_name=project_name,
            user_domain_name=user_domain_name,
            project_domain_name=project_domain_name,
            region_name=region_name,
        )

    if _openstack_manager is None:
        _openstack_manager = OpenStackManager()
    return _openstack_manager
