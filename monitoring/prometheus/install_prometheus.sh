#!/usr/bin/env bash
set -euo pipefail

PROM_VERSION="2.47.0"
INSTALL_DIR="/opt/prometheus"
TMP_DIR="/tmp/prometheus-install"
CONFIG_SOURCE="$(pwd)/monitoring/prometheus/prometheus.yml"

echo "Installing Prometheus ${PROM_VERSION} to ${INSTALL_DIR}"

sudo mkdir -p "${INSTALL_DIR}"
sudo rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}"
cd "${TMP_DIR}"

curl -L -o prometheus.tar.gz "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz"
tar xzf prometheus.tar.gz

sudo cp prometheus-${PROM_VERSION}.linux-amd64/prometheus "${INSTALL_DIR}/"
sudo cp prometheus-${PROM_VERSION}.linux-amd64/promtool "${INSTALL_DIR}/"
sudo cp -r prometheus-${PROM_VERSION}.linux-amd64/consoles "${INSTALL_DIR}/"
sudo cp -r prometheus-${PROM_VERSION}.linux-amd64/console_libraries "${INSTALL_DIR}/"

sudo mkdir -p "${INSTALL_DIR}/configuration"
sudo cp "${CONFIG_SOURCE}" "${INSTALL_DIR}/configuration/prometheus.yml"

sudo ln -sf "${INSTALL_DIR}/prometheus" /usr/local/bin/prometheus

cat <<'EOF'
Prometheus install complete.
Run:
  sudo /usr/local/bin/prometheus \
    --config.file=/opt/prometheus/configuration/prometheus.yml \
    --storage.tsdb.path=/opt/prometheus/data
EOF
