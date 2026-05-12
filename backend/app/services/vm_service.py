from app.services.openstack_service import create_connection


def create_vm(name, image_id, flavor_id, network_id):
    conn = create_connection()

    server = conn.compute.create_server(
        name=name,
        image_id=image_id,
        flavor_id=flavor_id,
        networks=[{"uuid": network_id}]
    )

    return server


def list_vms():
    conn = create_connection()
    return list(conn.compute.servers())