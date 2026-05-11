from ..utils.openstack_client import OpenStackClient
import logging

logger = logging.getLogger(__name__)

class OpenStackService:
    def __init__(self):
        self.client = OpenStackClient()
    
    def list_instances(self):
        try:
            nova = self.client.get_nova_client()
            servers = nova.servers.list()
            return [self._format_server(server) for server in servers]
        except Exception as e:
            logger.error(f"Error listing instances: {e}")
            raise
    
    def get_instance(self, instance_id):
        try:
            nova = self.client.get_nova_client()
            server = nova.servers.get(instance_id)
            return self._format_server(server)
        except Exception as e:
            logger.error(f"Error getting instance {instance_id}: {e}")
            raise
    
    def create_instance(self, name, image_id, flavor_id, network_id, key_name=None, security_groups=None):
        try:
            nova = self.client.get_nova_client()
            server = nova.servers.create(
                name=name,
                image=image_id,
                flavor=flavor_id,
                network=network_id,
                key_name=key_name,
                security_groups=security_groups
            )
            return self._format_server(server)
        except Exception as e:
            logger.error(f"Error creating instance: {e}")
            raise
    
    def delete_instance(self, instance_id):
        try:
            nova = self.client.get_nova_client()
            nova.servers.delete(instance_id)
            return {"message": f"Instance {instance_id} deleted successfully"}
        except Exception as e:
            logger.error(f"Error deleting instance {instance_id}: {e}")
            raise
    
    def perform_instance_action(self, instance_id, action):
        try:
            nova = self.client.get_nova_client()
            server = nova.servers.get(instance_id)
            
            if action == 'start':
                server.start()
                status = 'ACTIVE'
            elif action == 'stop':
                server.stop()
                status = 'SHUTOFF'
            elif action == 'reboot':
                server.reboot()
                status = 'REBOOT'
            elif action == 'suspend':
                server.suspend()
                status = 'SUSPENDED'
            elif action == 'resume':
                server.resume()
                status = 'ACTIVE'
            elif action == 'pause':
                server.pause()
                status = 'PAUSED'
            elif action == 'unpause':
                server.unpause()
                status = 'ACTIVE'
            else:
                raise ValueError(f"Unknown action: {action}")
            
            return {"instance_id": instance_id, "action": action, "status": status}
        except Exception as e:
            logger.error(f"Error performing action {action} on instance {instance_id}: {e}")
            raise
    
    def list_images(self):
        try:
            glance = self.client.get_glance_client()
            images = glance.images.list()
            return [{"id": img.id, "name": img.name, "status": img.status} for img in images]
        except Exception as e:
            logger.error(f"Error listing images: {e}")
            raise
    
    def list_flavors(self):
        try:
            nova = self.client.get_nova_client()
            flavors = nova.flavors.list()
            return [{"id": flavor.id, "name": flavor.name, "ram": flavor.ram, "vcpus": flavor.vcpus} for flavor in flavors]
        except Exception as e:
            logger.error(f"Error listing flavors: {e}")
            raise
    
    def list_networks(self):
        try:
            neutron = self.client.get_neutron_client()
            networks = neutron.list_networks()['networks']
            return [{"id": net['id'], "name": net['name'], "status": net['status']} for net in networks]
        except Exception as e:
            logger.error(f"Error listing networks: {e}")
            raise
    
    def _format_server(self, server):
        addresses = {}
        if hasattr(server, 'addresses'):
            for network, addrs in server.addresses.items():
                addresses[network] = [addr['addr'] for addr in addrs]
        
        return {
            "id": server.id,
            "name": server.name,
            "status": server.status,
            "created": server.created,
            "updated": server.updated,
            "image": server.image.get('id', '') if server.image else '',
            "flavor": server.flavor.get('id', '') if server.flavor else '',
            "addresses": addresses,
            "key_name": server.key_name if hasattr(server, 'key_name') else None,
            "security_groups": [sg['name'] for sg in server.security_groups] if hasattr(server, 'security_groups') else []
        }