from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from app.utils.helpers import setup_logging

load_dotenv()

db = SQLAlchemy()

def create_app(config_name=None):
    """Application factory"""
    app = Flask(__name__)
    
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'production')
    
    # Load configuration
    from app.config import config
    app.config.from_object(config.get(config_name, config['default']))
    
    # Override with environment variables
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL',
        app.config.get('SQLALCHEMY_DATABASE_URI', 'postgresql://postgres:postgres@db:5432/vm_portal')
    )
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config.get('CORS_ORIGINS', ['*'])}})
    
    # Setup logging
    setup_logging(app)
    
    # Register blueprints
    from app.routes import auth, vms, health, monitoring
    app.register_blueprint(auth.bp)
    app.register_blueprint(vms.bp)
    app.register_blueprint(health.bp)
    app.register_blueprint(monitoring.bp)
    
    # Create tables and initialize default data
    with app.app_context():
        db.create_all()
        # Initialize default admin
        from app.models.user import User
        if not User.query.filter_by(username='admin').first():
            admin = User.create_user('admin', 'admin123', role='admin')
            db.session.add(admin)
            db.session.commit()
            app.logger.info('Created default admin user')
    
    app.logger.info(f'Application started in {config_name} mode')
    
    return app
