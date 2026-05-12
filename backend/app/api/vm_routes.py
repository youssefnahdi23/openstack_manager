from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.services.vm_service import create_vm, list_vms

vm_bp = Blueprint("vm", __name__)


@vm_bp.route("/", methods=["GET"])
@jwt_required()
def get_vms():
    servers = list_vms()

    data = []

    for vm in servers:
        data.append({
            "id": vm.id,
            "name": vm.name,
            "status": vm.status
        })

    return data


@vm_bp.route("/create", methods=["POST"])
@jwt_required()
def create_vm_route():
    data = request.json

    vm = create_vm(
        data["name"],
        data["image_id"],
        data["flavor_id"],
        data["network_id"]
    )

    return {
        "message": "VM creation started",
        "vm_id": vm.id
    }