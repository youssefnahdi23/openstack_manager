from flask import jsonify


def success(message, data=None):
    return jsonify({
        "success": True,
        "message": message,
        "data": data
    })


def error(message):
    return jsonify({
        "success": False,
        "message": message
    }), 400