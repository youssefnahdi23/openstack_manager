import os
from app import create_app, db
from app.models.user import User, ActivityLog, VMLog
from app.utils.helpers import setup_logging

app = create_app()
setup_logging(app)

@app.shell_context_processor
def make_shell_context():
    """Create shell context for Flask CLI"""
    return {
        'db': db,
        'User': User,
        'ActivityLog': ActivityLog,
        'VMLog': VMLog,
    }

@app.before_request
def before_request():
    """Before request hook"""
    pass

@app.after_request
def after_request(response):
    """After request hook"""
    # Add security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return {'message': 'Resource not found'}, 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    app.logger.error(f'Internal server error: {error}')
    return {'message': 'Internal server error'}, 500

if __name__ == '__main__':
    debug = os.getenv('FLASK_DEBUG', 'False') == 'True'
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=debug)
