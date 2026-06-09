#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="python3"
PIP_BIN="pip3"

if ! command -v ${PYTHON_BIN} >/dev/null 2>&1; then
  echo "Python 3 is required. Install it first."
  exit 1
fi

if ! command -v ${PIP_BIN} >/dev/null 2>&1; then
  echo "pip3 is required. Installing python3-pip..."
  sudo apt-get update
  sudo apt-get install -y python3-pip
fi

echo "Installing OpenStack exporter using pip"
${PIP_BIN} install --user openstack-exporter

cat <<'EOF'
OpenStack exporter installation complete.
Run the exporter with:
  ~/.local/bin/openstack-exporter --env-file /etc/openstack-exporter/openstack.env
or add the required configuration file for your OpenStack environment.
EOF
