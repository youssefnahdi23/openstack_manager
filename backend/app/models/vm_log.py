from datetime import datetime
from app.models.base import db

class VMLog(db.Model):
    __tablename__ = "vm_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    vm_name = db.Column(db.String(255))
    action = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)