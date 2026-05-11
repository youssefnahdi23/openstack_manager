from keystoneauth1 import loading
from keystoneauth1 import session
from novaclient import client as nova_client
from neutronclient.v2_0 import client as neutron_client
from glanceclient import client as glance_client
from cinderclient import client as cinder_client
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class OpenStackClient:
    def __init__(self):
        self.session = None
        self._init_session()
    
    def _init_session(self):
        try:
            loader = loading.get_plugin_loader('password')
            auth = loader.load_from_options(
                auth_url=current_app.config['OPENSTACK_AUTH_URL'],
                username=current_app.config['OPENSTACK_USERNAME'],
                password=current_app.config['OPENSTACK_PASSWORD'],
                project_name=current_app.config['OPENSTACK_PROJECT_NAME'],
                project_domain_name=current_app.config['OPENSTACK_PROJECT_DOMAIN_NAME'],
                user_domain_name=current_app.config['OPENSTACK_USER_DOMAIN_NAME']
            )
            self.session = session.Session(auth=auth, verify=False)
            logger.info("OpenStack session initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenStack session: {e}")
            raise
    
    def get_nova_client(self):
        return nova_client.Client('2.1', session=self.session)
    
    def get_neutron_client(self):
        return neutron_client.Client(session=self.session)
    
    def get_glance_client(self):
        return glance_client.Client('2', session=self.session)
    
    def get_cinder_client(self):
        return cinder_client.Client('3', session=self.session)