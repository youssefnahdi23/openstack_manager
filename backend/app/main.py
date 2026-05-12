from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail

from app.config import Config

app = Flask(__name__)
app.config.from_object(Config)

CORS(app, supports_credentials=True)

jwt = JWTManager(app)
db = SQLAlchemy(app)
mail = Mail(app)

from app.api.auth_routes import auth_bp
from app.api.vm_routes import vm_bp
from app.api.admin_routes import admin_bp
from app.api.monitoring_routes import monitoring_bp

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(vm_bp, url_prefix="/api/vms")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(monitoring_bp, url_prefix="/api/monitoring")

@app.route("/")
def home():
    return {
        "message": "OpenStack VM Portal API"
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)