from flask import Blueprint, request

from app.models.user import User
from app.main import db
from app.auth.password_handler import hash_password, verify_password
from app.auth.jwt_handler import generate_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json

    user = User(
        username=data["username"],
        email=data["email"],
        password=hash_password(data["password"])
    )

    db.session.add(user)
    db.session.commit()

    return {"message": "User created"}


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json

    user = User.query.filter_by(email=data["email"]).first()

    if not user:
        return {"message": "Invalid credentials"}, 401

    if not verify_password(data["password"], user.password):
        return {"message": "Invalid credentials"}, 401

    token = generate_token(user.id, user.role)

    return {
        "token": token,
        "role": user.role,
        "username": user.username
    }