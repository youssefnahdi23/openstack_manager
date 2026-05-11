import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # OpenStack Configuration
    OPENSTACK_AUTH_URL = os.environ.get('OPENSTACK_AUTH_URL', 'http://192.168.91.128/identity')
    OPENSTACK_USERNAME = os.environ.get('OPENSTACK_USERNAME', 'admin')
    OPENSTACK_PASSWORD = os.environ.get('OPENSTACK_PASSWORD', 'pfestack26')
    OPENSTACK_PROJECT_NAME = os.environ.get('OPENSTACK_PROJECT_NAME', 'admin')
    OPENSTACK_PROJECT_DOMAIN_NAME = os.environ.get('OPENSTACK_PROJECT_DOMAIN_NAME', 'Default')
    OPENSTACK_USER_DOMAIN_NAME = os.environ.get('OPENSTACK_USER_DOMAIN_NAME', 'Default')