from flask import Blueprint
from app.services.monitoring_service import get_cpu_usage

monitoring_bp = Blueprint("monitoring", __name__)


@monitoring_bp.route("/cpu", methods=["GET"])
def cpu_usage():
    return get_cpu_usage()