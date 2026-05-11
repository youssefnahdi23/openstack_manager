from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import logging

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

# Simple user store - in production, use a database
USERS = {
    "admin": "pfestack26"
}

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if username in USERS and USERS[username] == password:
            access_token = create_access_token(identity=username)
            return jsonify({
                "access_token": access_token,
                "user": username
            })
        
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        logger.error(f"Error in login: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    current_user = get_jwt_identity()
    return jsonify({"user": current_user, "status": "valid"})