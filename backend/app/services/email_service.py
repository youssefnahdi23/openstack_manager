from flask_mail import Message
from app.main import mail


def send_email(recipient, subject, body):
    msg = Message(
        subject=subject,
        recipients=[recipient],
        body=body
    )

    mail.send(msg)