from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)
    
    from .api.instances import instances_bp
    from .api.monitoring import monitoring_bp
    from .api.auth import auth_bp
    
    app.register_blueprint(instances_bp, url_prefix='/api/instances')
    app.register_blueprint(monitoring_bp, url_prefix='/api/monitoring')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'service': 'devstack-manager'}
    
    return app