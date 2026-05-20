#!/bin/bash
set -e

# Generate SSH key if it doesn't exist
SSH_HOME="/root"
SSH_DIR="$SSH_HOME/.ssh"
SSH_KEY="$SSH_DIR/id_rsa"

if [ ! -d "$SSH_DIR" ]; then
  mkdir -p "$SSH_DIR"
  chmod 700 "$SSH_DIR"
fi

if [ ! -f "$SSH_KEY" ]; then
  ssh-keygen -t rsa -N "" -f "$SSH_KEY" >/dev/null 2>&1
  chmod 600 "$SSH_KEY"
fi

# Create SSH config to disable host key checking
cat > "$SSH_DIR/config" << 'EOF'
Host *
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
  ConnectTimeout 5
EOF
chmod 600 "$SSH_DIR/config"

# Export SSH to PATH
export PATH="/usr/bin:/bin:/usr/local/bin:$PATH"

# Start ttyd with dynamic command handling
# ttyd will invoke a command that checks for SSH_TARGET environment variable
exec ttyd -p 7681 bash -c '
  # Try to get SSH target from query parameter or environment
  # Since we cant easily parse query params in ttyd, we use a wrapper command
  if [ -n "$SSH_TARGET" ]; then
    # Try SSH to target with multiple common users
    for user in ubuntu root debian ec2-user centos; do
      timeout 3 ssh -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$user@$SSH_TARGET" 2>/dev/null && exit 0
    done
    # Fallback to bash if SSH fails
    echo "Failed to connect to $SSH_TARGET via SSH"
    bash
  else
    bash
  fi
'
