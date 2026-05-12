from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.models.user import User
from app.utils.decorators import admin_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required()
def get_users():
    users = User.query.all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
        for user in users
    ]