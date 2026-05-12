from flask_jwt_extended import create_access_token


def generate_token(identity, role):
    return create_access_token(
        identity=identity,
        additional_claims={"role": role}
    )