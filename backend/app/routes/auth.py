from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User, ActivityLog, token_required
import logging

bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)


@bp.route('/login', methods=['POST'])
def login():
    """Login endpoint"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'message': 'Missing username or password'}), 400
        
        user = User.query.filter_by(username=data.get('username')).first()
        
        # Log login attempt
        activity = ActivityLog(
            user_id=user.id if user else None,
            action='login_attempt',
            details=f"Login attempt for user: {data.get('username')}",
            status='success' if user and user.verify_password(data.get('password')) else 'failed'
        )
        db.session.add(activity)
        
        if not user or not user.verify_password(data.get('password')):
            db.session.commit()
            logger.warning(f"Failed login attempt for user: {data.get('username')}")
            return jsonify({'message': 'Invalid username or password'}), 401
        
        db.session.commit()
        
        token = user.generate_token()
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500


@bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Logout endpoint"""
    try:
        activity = ActivityLog(
            user_id=current_user.id,
            action='logout',
            details=f"User {current_user.username} logged out",
            status='success'
        )
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({'message': 'Logout successful'}), 200
    
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500


@bp.route('/current-user', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get current user info"""
    try:
        return jsonify({
            'user': current_user.to_dict()
        }), 200
    
    except Exception as e:
        logger.error(f'Get current user error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500


@bp.route('/verify-token', methods=['GET'])
@token_required
def verify_token(current_user):
    """Verify if token is valid"""
    try:
        return jsonify({
            'valid': True,
            'user': current_user.to_dict()
        }), 200
    
    except Exception as e:
        logger.error(f'Token verification error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500


@bp.route('/refresh-token', methods=['POST'])
@token_required
def refresh_token(current_user):
    """Refresh token to extend session (for session keep-alive)"""
    try:
        # Generate a new token with fresh expiry time
        new_token = current_user.generate_token(expires_in=7200)  # 2 hours
        
        return jsonify({
            'message': 'Token refreshed',
            'token': new_token,
            'user': current_user.to_dict()
        }), 200
    
    except Exception as e:
        logger.error(f'Token refresh error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500


@bp.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    """Allow a logged-in user to change their password by providing the current password and a new password."""
    try:
        data = request.get_json() or {}
        current = data.get('current_password')
        new = data.get('new_password')

        if not current or not new:
            return jsonify({'message': 'Missing current or new password'}), 400

        if not current_user.verify_password(current):
            return jsonify({'message': 'Current password is incorrect'}), 403

        if len(new) < 6:
            return jsonify({'message': 'New password must be at least 6 characters'}), 400

        # Update password hash
        current_user.password_hash = User.hash_password(new)
        db.session.commit()

        activity = ActivityLog(
            user_id=current_user.id,
            action='change_password',
            details='User changed password',
            status='success'
        )
        db.session.add(activity)
        db.session.commit()

        return jsonify({'message': 'Password changed successfully'}), 200
    except Exception as e:
        logger.error(f'Change password error: {str(e)}')
        return jsonify({'message': 'Internal server error'}), 500
