from app import db
from datetime import datetime
import bcrypt
import jwt
import os
from functools import wraps
from flask import request, jsonify, current_app


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='user', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @staticmethod
    def hash_password(password):
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password):
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    @classmethod
    def create_user(cls, username, password, role='user'):
        """Create a new user"""
        user = cls(
            username=username,
            password_hash=cls.hash_password(password),
            role=role
        )
        return user
    
    def generate_token(self, expires_in=86400):
        """Generate JWT token"""
        payload = {
            'user_id': self.id,
            'username': self.username,
            'role': self.role,
            'exp': datetime.utcnow().timestamp() + expires_in
        }
        return jwt.encode(
            payload,
            current_app.config['JWT_SECRET_KEY'],
            algorithm='HS256'
        )
    
    @staticmethod
    def verify_token(token):
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256']
            )
            return payload
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
    
    def to_dict(self):
        """Convert user to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }


def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        payload = User.verify_token(token)
        if not payload:
            return jsonify({'message': 'Invalid or expired token'}), 401
        
        current_user = User.query.get(payload['user_id'])
        if not current_user:
            return jsonify({'message': 'User not found'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(255), nullable=False)
    details = db.Column(db.Text)
    status = db.Column(db.String(50), default='success')  # success, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('activities', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'details': self.details,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }


class VMLog(db.Model):
    __tablename__ = 'vm_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    instance_id = db.Column(db.String(255), nullable=False)
    instance_name = db.Column(db.String(255))
    action = db.Column(db.String(255), nullable=False)  # create, delete, start, stop, reboot
    status = db.Column(db.String(50), default='pending')  # pending, success, failed
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('vm_logs', lazy='dynamic'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'instance_id': self.instance_id,
            'instance_name': self.instance_name,
            'action': self.action,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat()
        }
