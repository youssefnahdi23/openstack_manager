import json
import os
import smtplib
from email.message import EmailMessage
from flask import Blueprint, request, jsonify, make_response, current_app
import io
import csv
from app import db
from app.models.user import token_required, VMLog
from app.models.student import Student
from app.utils.openstack import get_openstack_manager
import logging
import requests


def _sanitize_error_text(text):
    if text is None:
        return None
    return ' '.join(str(text).split())

bp = Blueprint('vms', __name__, url_prefix='/api/vms')
logger = logging.getLogger(__name__)


def get_openstack_manager_for_request():
    project_name = request.headers.get('X-OpenStack-Project') or os.getenv('OPENSTACK_PROJECT_NAME', 'admin')
    return get_openstack_manager(project_name=project_name)


def _normalize_network_ids(network_ids):
    if network_ids is None:
        return []
    if isinstance(network_ids, str):
        try:
            parsed = json.loads(network_ids)
            network_ids = parsed
        except ValueError:
            network_ids = [network_ids]
    if isinstance(network_ids, (list, tuple, set)):
        return [str(item).strip() for item in network_ids if item is not None and str(item).strip()]
    return [str(network_ids).strip()] if str(network_ids).strip() else []


@bp.route('/instances', methods=['GET'])
@token_required
def list_instances(current_user):
    """List all instances"""
    try:
        manager = get_openstack_manager_for_request()
        instances = manager.list_instances()
        return jsonify({
            'instances': instances
        }), 200
    
    except Exception as e:
        logger.error(f'Error listing instances: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>', methods=['GET'])
@token_required
def get_instance(current_user, instance_id):
    """Get instance details"""
    try:
        manager = get_openstack_manager_for_request()
        instance = manager.get_instance(instance_id)
        if not instance:
            return jsonify({'message': 'Instance not found'}), 404
        
        return jsonify({'instance': instance}), 200
    
    except Exception as e:
        logger.error(f'Error getting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances', methods=['POST'])
@token_required
def create_instance(current_user):
    """Create a new instance"""
    try:
        data = request.get_json() or {}
        
        if not data.get('name') or not data.get('flavor_id') or not data.get('image_id'):
            return jsonify({'message': 'Missing required fields'}), 400

        count = int(data.get('count', 1))
        assign_floating_ip = bool(data.get('assign_floating_ip', False))
        network_ids = _normalize_network_ids(data.get('network_ids'))
        if data.get('network_id') and not network_ids:
            network_ids = _normalize_network_ids(data.get('network_id'))
        key_name = data.get('key_name')
        manager = get_openstack_manager_for_request()
        # Ensure we have valid network IDs before calling OpenStack
        try:
            if not network_ids:
                try:
                    default_net = manager._get_default_network_id()
                except Exception:
                    default_net = None
                if default_net:
                    network_ids = [default_net]
                else:
                    msg = 'No network selected and no default network is available. Please select a network.'
                    logger.error(f'Create instance rejected: {msg}; payload={data}')
                    return jsonify({'message': msg}), 400

            created_instances = manager.create_instances(
                name=data.get('name'),
                flavor_id=data.get('flavor_id'),
                image_id=data.get('image_id'),
                network_ids=network_ids,
                count=count,
                assign_floating_ip=assign_floating_ip,
                key_name=key_name
            )

            failed_instances = [inst for inst in created_instances if inst.get('status', '').upper() != 'ACTIVE']
            if failed_instances:
                failed_details = []
                failed_logs = []
                for inst in failed_instances:
                    details = manager.get_instance(inst.get('id')) or {}
                    failed_details.append({
                        'id': inst.get('id'),
                        'name': inst.get('name'),
                        'status': inst.get('status'),
                        'fault': details.get('fault')
                    })
                    failed_logs.append(VMLog(
                        user_id=current_user.id,
                        instance_id=inst.get('id', ''),
                        instance_name=inst.get('name'),
                        action='create',
                        status='failed',
                        message=str(details.get('fault') or details.get('status'))
                    ))

                if failed_logs:
                    db.session.add_all(failed_logs)
                    db.session.commit()

                message = f"{len(failed_details)} instance(s) failed to build"
                logger.error(f'Create instance failed: {message}; details={failed_details}')
                return jsonify({'message': message, 'failed_instances': failed_details}), 500

            vm_logs = []
            for instance in created_instances:
                vm_logs.append(VMLog(
                    user_id=current_user.id,
                    instance_id=instance.get('id', ''),
                    instance_name=instance.get('name'),
                    action='create',
                    status='success'
                ))

            db.session.add_all(vm_logs)
            db.session.commit()

            return jsonify({
                'message': 'Instance(s) created successfully',
                'instances': created_instances
            }), 201

        except Exception as e:
            failed_log = VMLog(
                user_id=current_user.id,
                instance_id='',
                instance_name=data.get('name'),
                action='create',
                status='failed',
                message=str(e)
            )
            db.session.add(failed_log)
            db.session.commit()
            raise e
    
    except ValueError as e:
        message = _sanitize_error_text(str(e))
        logger.error(f'Error creating instance: {message}')
        return jsonify({'message': message}), 400
    except Exception as e:
        message = _sanitize_error_text(str(e))
        logger.error(f'Error creating instance: {message}')
        return jsonify({'message': message}), 500


@bp.route('/instances/<instance_id>', methods=['DELETE'])
@token_required
def delete_instance(current_user, instance_id):
    """Delete an instance"""
    try:
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='delete',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            manager = get_openstack_manager_for_request()
            manager.delete_instance(instance_id)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance deleted successfully'}), 200
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error deleting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/start', methods=['POST'])
@token_required
def start_instance(current_user, instance_id):
    """Start a stopped instance"""
    try:
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='start',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            manager = get_openstack_manager_for_request()
            manager.start_instance(instance_id)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance started successfully'}), 200
        
        except Exception as e:
            # If instance is in rescued vm_state, surface a clearer message
            msg = str(e)
            if 'rescued' in msg.lower() or 'vm_state rescued' in msg.lower():
                msg = (
                    f"Instance is in 'rescued' state and cannot be started. "
                    f"Call the unrescue endpoint to return it to a normal state: /api/vms/instances/{instance_id}/unrescue"
                )
                vm_log.status = 'failed'
                vm_log.message = msg
                db.session.commit()
                return jsonify({'message': msg}), 409
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error starting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/stop', methods=['POST'])
@token_required
def stop_instance(current_user, instance_id):
    """Stop a running instance"""
    try:
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='stop',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            manager = get_openstack_manager_for_request()
            manager.stop_instance(instance_id)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance stopped successfully'}), 200
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error stopping instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/reboot', methods=['POST'])
@token_required
def reboot_instance(current_user, instance_id):
    """Reboot an instance"""
    try:
        data = request.get_json() or {}
        hard_reboot = data.get('hard', False)
        
        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            action='reboot',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()
        
        try:
            manager = get_openstack_manager_for_request()
            manager.reboot_instance(instance_id, hard=hard_reboot)
            vm_log.status = 'success'
            db.session.commit()
            
            return jsonify({'message': 'Instance rebooted successfully'}), 200
        
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e
    
    except Exception as e:
        logger.error(f'Error rebooting instance: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/flavors', methods=['GET'])
@token_required
def list_flavors(current_user):
    """List all flavors"""
    try:
        manager = get_openstack_manager_for_request()
        flavors = manager.list_flavors()
        return jsonify({'flavors': flavors}), 200
    
    except Exception as e:
        logger.error(f'Error listing flavors: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/images', methods=['GET'])
@token_required
def list_images(current_user):
    """List all images"""
    try:
        manager = get_openstack_manager_for_request()
        images = manager.list_images()
        return jsonify({'images': images}), 200
    
    except Exception as e:
        logger.error(f'Error listing images: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/networks', methods=['GET'])
@token_required
def list_networks(current_user):
    """List all networks"""
    try:
        logger.info(f"User '{current_user.username}' requested network list; headers={dict(request.headers)}")
        manager = get_openstack_manager_for_request()
        networks = manager.list_networks()

        if not networks:
            logger.warning('No networks visible in current project, falling back to admin network list')
            admin_manager = get_openstack_manager()
            networks = admin_manager.list_networks()
            for network in networks:
                network['source'] = 'admin'

        return jsonify({'networks': networks}), 200
    
    except Exception as e:
        logger.error(f'Error listing networks: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/keypairs', methods=['GET'])
@token_required
def list_keypairs(current_user):
    """List available keypairs"""
    try:
        logger.info(f"User '{current_user.username}' requested keypair list; headers={dict(request.headers)}")
        manager = get_openstack_manager_for_request()
        keypairs = manager.list_keypairs()

        if not keypairs:
            logger.warning('No keypairs visible in current project, falling back to admin keypair list')
            admin_manager = get_openstack_manager()
            keypairs = admin_manager.list_keypairs()
            for keypair in keypairs:
                keypair['source'] = 'admin'

        return jsonify({'keypairs': keypairs}), 200
    except Exception as e:
        logger.error(f'Error listing keypairs: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/snapshot', methods=['POST'])
@token_required
def create_snapshot(current_user, instance_id):
    """Create a snapshot image from an instance"""
    try:
        data = request.get_json() or {}
        name = data.get('name') or f'{instance_id}-snapshot'

        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            instance_name=name,
            action='snapshot',
            status='pending'
        )
        db.session.add(vm_log)
        db.session.commit()

        try:
            manager = get_openstack_manager_for_request()
            image = manager.create_snapshot(instance_id, name)
            vm_log.status = 'success'
            db.session.commit()

            return jsonify({'message': 'Snapshot created', 'image': image}), 201
        except Exception as e:
            vm_log.status = 'failed'
            vm_log.message = str(e)
            db.session.commit()
            raise e

    except Exception as e:
        logger.error(f'Error creating snapshot: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/images/from-url', methods=['POST'])
@token_required
def create_image_from_url(current_user):
    """Import/create an image from a remote URL"""
    try:
        data = request.get_json() or {}
        url = data.get('url')
        name = data.get('name')

        if not url:
            return jsonify({'message': 'Missing image URL'}), 400

        manager = get_openstack_manager_for_request()
        image = manager.create_image_from_url(url, name=name)

        return jsonify({'message': 'Image import started', 'image': image}), 202
    except Exception as e:
        logger.error(f'Error importing image from url: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/export/devstack-csv', methods=['GET'])
@token_required
def export_devstack_csv(current_user):
    """Export instance list as CSV"""
    try:
        manager = get_openstack_manager_for_request()
        instances = manager.list_instances() or []

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['id', 'name', 'status', 'flavor', 'image', 'floating_ip', 'created', 'updated'])

        for inst in instances:
            writer.writerow([
                inst.get('id'),
                inst.get('name'),
                inst.get('status'),
                inst.get('flavor'),
                inst.get('image'),
                inst.get('floating_ip'),
                inst.get('created'),
                inst.get('updated')
            ])

        resp = make_response(output.getvalue())
        resp.headers['Content-Type'] = 'text/csv'
        resp.headers['Content-Disposition'] = 'attachment; filename=devstack-instances.csv'
        return resp
    except Exception as e:
        logger.error(f'Error exporting CSV: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/projects', methods=['GET'])
def list_projects():
    """List all OpenStack projects using environment credentials"""
    try:
        manager = get_openstack_manager()
        projects = manager.list_projects()
        return jsonify({'projects': projects}), 200
    except Exception as e:
        logger.error(f'Error listing projects: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/console', methods=['GET'])
@token_required
def get_console(current_user, instance_id):
    """Get noVNC console access for an instance"""
    try:
        logger.info(f"User '{current_user.username}' requested noVNC console for instance {instance_id}")
        manager = get_openstack_manager_for_request()
        instance = manager.get_instance(instance_id)
        if not instance:
            return jsonify({'message': 'Instance not found'}), 404

        vnc_url = manager.get_vnc_console(instance_id)
        return jsonify({
            'console_url': vnc_url,
            'instance': instance
        }), 200
    except Exception as e:
        logger.error(f'Error getting console: {str(e)}', exc_info=True)
        return jsonify({'message': f'Unable to create noVNC console for this instance: {str(e)}'}), 500


@bp.route('/instances/<instance_id>/unrescue', methods=['POST'])
@token_required
def unrescue_instance(current_user, instance_id):
    """Unrescue an instance that is in rescued vm_state"""
    try:
        logger.info(f"User '{current_user.username}' requested unrescue for instance {instance_id}")
        manager = get_openstack_manager_for_request()
        success = manager.unrescue_instance(instance_id)
        if success:
            return jsonify({'message': 'Instance unrescued successfully'}), 200
        return jsonify({'message': 'Failed to unrescue instance'}), 500
    except Exception as e:
        logger.error(f'Error unrescuing instance: {str(e)}', exc_info=True)
        return jsonify({'message': str(e)}), 500


@bp.route('/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    """Get OpenStack statistics"""
    try:
        manager = get_openstack_manager_for_request()
        stats = manager.get_stats()
        return jsonify({'stats': stats}), 200
    
    except Exception as e:
        logger.error(f'Error getting stats: {str(e)}')
        return jsonify({'message': str(e)}), 500


@bp.route('/instances/<instance_id>/email', methods=['POST'])
@token_required
def email_instance(current_user, instance_id):
    """Send VM public IP to one or more students via Brevo"""
    try:
        data = request.get_json() or {}
        student_ids = data.get('student_ids') or []
        if not student_ids:
            return jsonify({'message': 'No students selected'}), 400

        manager = get_openstack_manager_for_request()
        instance = manager.get_instance(instance_id)
        if not instance:
            return jsonify({'message': 'Instance not found'}), 404

        # Prefer explicit floating_ip field, fall back to addresses
        floating_ip = instance.get('floating_ip') or ''
        if not floating_ip:
            addresses = instance.get('addresses') or {}
            first_ip = None
            try:
                for net, lst in (addresses.items() if isinstance(addresses, dict) else []):
                    if lst and isinstance(lst, list):
                        first = lst[0]
                        first_ip = first.get('addr') or first.get('address') or None
                        if first_ip:
                            break
            except Exception:
                first_ip = None
            floating_ip = first_ip or ''

        students = Student.query.filter(Student.id.in_(student_ids)).all()
        if not students:
            return jsonify({'message': 'No matching students found'}), 404

        to_list = [{'email': s.email, 'name': s.name} for s in students]

        brevo_key = current_app.config.get('BREVO_API_KEY', '').strip()
        sender_name = current_app.config.get('BREVO_SENDER_NAME', 'VM Portal')
        sender_email = current_app.config.get('BREVO_SENDER_EMAIL', '').strip()
        smtp_server = current_app.config.get('SMTP_SERVER', '').strip()
        smtp_port = current_app.config.get('SMTP_PORT', 587)
        smtp_username = current_app.config.get('SMTP_USERNAME', '').strip()
        smtp_password = current_app.config.get('SMTP_PASSWORD', '').strip()
        smtp_use_tls = current_app.config.get('SMTP_USE_TLS', True)
        email_provider = current_app.config.get('EMAIL_PROVIDER', '').strip().lower()

        # Prefer an explicitly configured sender email.
        # If the configured sender is still a placeholder or missing, use SMTP username when available.
        const_placeholder_emails = ('no-reply@example.com', 'no-reply@pfe.com', 'no-reply@localhost')
        if not sender_email or sender_email.lower() in const_placeholder_emails:
            sender_email = smtp_username or sender_email

        if not sender_email:
            sender_email = 'no-reply@example.com'

        if email_provider == 'smtp':
            provider = 'smtp'
        elif email_provider == 'brevo':
            provider = 'brevo'
        else:
            provider = 'brevo' if brevo_key else 'smtp'

        if email_provider and email_provider not in ('smtp', 'brevo'):
            logger.warning(f'Unexpected EMAIL_PROVIDER value: {email_provider!r}. Falling back to {provider}.')

        logger.info(f'Email provider override={email_provider!r}, selected={provider}, sender={sender_email}, recipients={len(to_list)}')

        instance_name = instance.get('name') or instance_id
        subject = f"VM '{instance_name}' access details"

        plain_text = (
            f"Your VM '{instance_name}' is reachable at the public IP below:\n\n"
            f"Instance ID: {instance_id}\n"
            f"VM Name: {instance_name}\n"
            f"Public IP: {floating_ip or 'Not available'}\n\n"
            "If you have any questions, please reply to this email."
        )

        html = f"""
        <html>
          <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                    <tr>
                      <td style="background:#0f172a;color:#ffffff;padding:28px 32px;">
                        <h1 style="margin:0;font-size:24px;line-height:1.2;">VM Access Details</h1>
                        <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#cbd5e1;">Your virtual machine is ready and available below.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px;">
                        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;">Hi there,</p>
                        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">Here are the access details for your VM:</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          <tr>
                            <td style="padding:14px 16px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:700;width:160px;">VM Name</td>
                            <td style="padding:14px 16px;border:1px solid #e5e7eb;background:#f8fafc;">{instance_name}</td>
                          </tr>
                          <tr>
                            <td style="padding:14px 16px;border:1px solid #e5e7eb;background:#ffffff;font-weight:700;">Instance ID</td>
                            <td style="padding:14px 16px;border:1px solid #e5e7eb;background:#ffffff;">{instance_id}</td>
                          </tr>
                          <tr>
                            <td style="padding:14px 16px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:700;">Public IP</td>
                            <td style="padding:14px 16px;border:1px solid #e5e7eb;background:#f8fafc;">{floating_ip or 'Not available'}</td>
                          </tr>
                        </table>
                        <p style="margin:24px 0 0;font-size:15px;line-height:1.7;">If you need help accessing this VM, reply to this email or contact your system administrator.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f8fafc;padding:22px 32px;color:#475569;font-size:13px;line-height:1.5;">
                        <p style="margin:0;">Sent by {sender_name}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """

        if provider == 'brevo':
            if not brevo_key:
                return jsonify({'message': 'Brevo API key not configured'}), 500

            payload = {
                'sender': {'name': sender_name, 'email': sender_email},
                'to': to_list,
                'subject': subject,
                'textContent': plain_text,
                'htmlContent': html
            }
            headers = {'api-key': brevo_key, 'Content-Type': 'application/json'}
            resp = requests.post('https://api.brevo.com/v3/smtp/email', json=payload, headers=headers, timeout=15)

            if resp.status_code not in (200, 201, 202):
                logger.error(f'Brevo send failed: {resp.status_code} {resp.text}')
                return jsonify({'message': 'Failed to send emails', 'detail': resp.text}), 502
        elif provider == 'smtp':
            if not smtp_server or not smtp_username or not smtp_password:
                return jsonify({'message': 'SMTP provider is not configured'}), 500
            try:
                message = EmailMessage()
                message['Subject'] = subject
                message['From'] = f'{sender_name} <{sender_email}>'
                message['To'] = ', '.join([f"{recipient['name']} <{recipient['email']}>" for recipient in to_list])
                message.set_content(plain_text)
                message.add_alternative(html, subtype='html')

                with smtplib.SMTP(smtp_server, smtp_port, timeout=15) as smtp:
                    if smtp_use_tls:
                        smtp.starttls()
                    smtp.login(smtp_username, smtp_password)
                    smtp.send_message(message)
            except Exception as exc:
                logger.error(f'SMTP send failed: {exc}', exc_info=True)
                return jsonify({'message': 'Failed to send emails via SMTP', 'detail': str(exc)}), 502
        else:
            return jsonify({'message': 'Email provider is not configured'}), 500

        vm_log = VMLog(
            user_id=current_user.id,
            instance_id=instance_id,
            instance_name=instance.get('name'),
            action='email',
            status='success',
            message=f'Sent to {len(to_list)} recipients'
        )
        db.session.add(vm_log)
        db.session.commit()

        return jsonify({'message': 'Emails sent'}), 200

    except Exception as e:
        logger.error(f'Error sending VM email: {e}', exc_info=True)
        try:
            vm_log = VMLog(
                user_id=current_user.id,
                instance_id=instance_id,
                instance_name=instance.get('name') if 'instance' in locals() and instance else '',
                action='email',
                status='failed',
                message=str(e)
            )
            db.session.add(vm_log)
            db.session.commit()
        except Exception:
            pass
        return jsonify({'message': str(e)}), 500
