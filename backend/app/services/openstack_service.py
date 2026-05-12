from openstack import connection
import os


def create_connection():
    return connection.Connection(
        auth_url=os.getenv("OS_AUTH_URL"),
        username=os.getenv("OS_USERNAME"),
        password=os.getenv("OS_PASSWORD"),
        project_name=os.getenv("OS_PROJECT_NAME"),
        user_domain_name=os.getenv("OS_USER_DOMAIN_NAME"),
        project_domain_name=os.getenv("OS_PROJECT_DOMAIN_NAME"),
        region_name=os.getenv("OS_REGION_NAME")
    )