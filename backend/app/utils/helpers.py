import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logging(app):
    """Configure logging for the Flask application"""
    
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    log_dir = 'logs'
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Create formatters
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler for all logs
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(getattr(logging, log_level))
    
    # File handler for error logs
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'error.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)
    
    # Add handlers to app logger
    app.logger.addHandler(file_handler)
    app.logger.addHandler(error_handler)
    app.logger.setLevel(getattr(logging, log_level))
    
    # Set level for werkzeug logger
    logging.getLogger('werkzeug').setLevel(getattr(logging, log_level))
    
    app.logger.info('Logging configured successfully')


class ValidationError(Exception):
    """Custom validation error"""
    pass


class OpenStackError(Exception):
    """Custom OpenStack error"""
    pass


def validate_vm_creation_data(data):
    """Validate VM creation data"""
    errors = []
    
    if not data.get('name'):
        errors.append('Instance name is required')
    
    if not data.get('flavor_id'):
        errors.append('Flavor ID is required')
    
    if not data.get('image_id'):
        errors.append('Image ID is required')
    
    if len(data.get('name', '')) > 255:
        errors.append('Instance name must be less than 255 characters')
    
    if errors:
        raise ValidationError('; '.join(errors))
    
    return True
