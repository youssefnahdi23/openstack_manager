from datetime import datetime
from app.models.base import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True)
    email = db.Column(db.String(255), unique=True)
    password = db.Column(db.String(255))
    role = db.Column(db.String(50), default="student")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)