from flask import Blueprint, request, jsonify
from app import db
from app.models.user import token_required
from app.models.student import Student
import logging

bp = Blueprint('students', __name__, url_prefix='/api/students')
logger = logging.getLogger(__name__)


@bp.route('/', methods=['GET'])
@token_required
def list_students(current_user):
    try:
        students = Student.query.order_by(Student.name).all()
        return jsonify({'students': [s.to_dict() for s in students]}), 200
    except Exception as e:
        logger.error(f'Error listing students: {e}')
        return jsonify({'message': str(e)}), 500


@bp.route('/', methods=['POST'])
@token_required
def create_student(current_user):
    try:
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        if not name or not email:
            return jsonify({'message': 'Missing name or email'}), 400
        if Student.query.filter_by(email=email).first():
            return jsonify({'message': 'Email already exists'}), 409
        student = Student(name=name, email=email)
        db.session.add(student)
        db.session.commit()
        return jsonify({'student': student.to_dict()}), 201
    except Exception as e:
        logger.error(f'Error creating student: {e}')
        return jsonify({'message': str(e)}), 500


@bp.route('/<int:student_id>', methods=['PUT'])
@token_required
def update_student(current_user, student_id):
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        if name:
            student.name = name
        if email:
            # check uniqueness
            existing = Student.query.filter(Student.email == email, Student.id != student_id).first()
            if existing:
                return jsonify({'message': 'Email already in use'}), 409
            student.email = email
        db.session.commit()
        return jsonify({'student': student.to_dict()}), 200
    except Exception as e:
        logger.error(f'Error updating student: {e}')
        return jsonify({'message': str(e)}), 500


@bp.route('/<int:student_id>', methods=['DELETE'])
@token_required
def delete_student(current_user, student_id):
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({'message': 'Student not found'}), 404
        db.session.delete(student)
        db.session.commit()
        return jsonify({'message': 'Student deleted'}), 200
    except Exception as e:
        logger.error(f'Error deleting student: {e}')
        return jsonify({'message': str(e)}), 500
