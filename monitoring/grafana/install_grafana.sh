#!/usr/bin/env bash
set -euo pipefail

if ! command -v grafana-server >/dev/null 2>&1; then
  echo "Installing Grafana OSS"
  sudo apt-get update
  sudo apt-get install -y apt-transport-https software-properties-common wget gnupg
  wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
  sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
  sudo apt-get update
  sudo apt-get install -y grafana
else
  echo "Grafana is already installed"
fi

sudo systemctl enable grafana-server

echo "Grafana installed. Start it with: sudo systemctl start grafana-server"
echo "Dashboards can be added to monitoring/grafana/dashboards"
