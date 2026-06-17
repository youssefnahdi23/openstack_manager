#!/usr/bin/env bash
set -euo pipefail

NODE_VERSION="1.7.0"
INSTALL_DIR="/opt/node_exporter"
TMP_DIR="/tmp/node-exporter-install"

echo "Installing Prometheus Node Exporter ${NODE_VERSION}"

sudo mkdir -p "${INSTALL_DIR}"
sudo rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}"
cd "${TMP_DIR}"

curl -L -o node_exporter.tar.gz "https://github.com/prometheus/node_exporter/releases/download/v${NODE_VERSION}/node_exporter-${NODE_VERSION}.linux-amd64.tar.gz"
tar xzf node_exporter.tar.gz

sudo cp node_exporter-${NODE_VERSION}.linux-amd64/node_exporter "${INSTALL_DIR}/"
sudo ln -sf "${INSTALL_DIR}/node_exporter" /usr/local/bin/node_exporter

sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<'EOF'
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
User=nobody
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable node_exporter

echo "Node Exporter installed. Start service with: sudo systemctl start node_exporter"
