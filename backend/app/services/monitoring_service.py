import psutil
import subprocess
import re
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MonitoringService:
    @staticmethod
    def get_system_metrics():
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Network I/O
            net_io = psutil.net_io_counters()
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "percent": memory.percent
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": disk.percent
                },
                "network": {
                    "bytes_sent": net_io.bytes_sent,
                    "bytes_recv": net_io.bytes_recv,
                    "packets_sent": net_io.packets_sent,
                    "packets_recv": net_io.packets_recv
                }
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            raise
    
    @staticmethod
    def get_instance_metrics(instance_ip):
        # This is a placeholder - in production, you'd use SSH to connect to instances
        # or use ceilometer/telemetry services
        return {
            "instance_ip": instance_ip,
            "metrics": {
                "cpu_usage": 0,
                "memory_usage": 0,
                "disk_usage": 0,
                "network_in": 0,
                "network_out": 0
            }
        }
    
    @staticmethod
    def get_openstack_services_status():
        try:
            # Check OpenStack services
            result = subprocess.run(['systemctl', 'list-units', '--type=service', '--state=running'], 
                                  capture_output=True, text=True)
            
            openstack_services = []
            for line in result.stdout.split('\n'):
                if 'devstack' in line or 'openstack' in line.lower():
                    parts = line.split()
                    if len(parts) >= 4:
                        openstack_services.append({
                            "name": parts[0],
                            "status": parts[3]
                        })
            
            return {
                "services": openstack_services,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting OpenStack services: {e}")
            return {"services": [], "error": str(e)}