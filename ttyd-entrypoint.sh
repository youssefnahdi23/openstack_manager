#!/bin/bash
set -e

# Generate SSH key if it doesn't exist
if [ ! -d /root/.ssh ]; then
  mkdir -p /root/.ssh
fi

if [ ! -f /root/.ssh/id_rsa ]; then
  ssh-keygen -t rsa -N "" -f /root/.ssh/id_rsa
fi

# Create a wrapper script that ttyd will execute
# This script checks for SSH_TARGET env var or expects it to be passed
cat > /tmp/ttyd-wrapper.sh << 'EOF'
#!/bin/bash

# If SSH_TARGET is passed as environment variable, SSH to it
# Otherwise check URL parameter or fall back to bash
if [ -n "$SSH_TARGET" ]; then
  # Remove :7681/ssh or similar path from target if present
  TARGET="${SSH_TARGET##*/}"
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 ubuntu@"$TARGET" || \
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 root@"$TARGET" || \
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 debian@"$TARGET" || \
  bash
else
  bash
fi
EOF

chmod +x /tmp/ttyd-wrapper.sh

# Add StrictHostKeyChecking=no to SSH config for all hosts
mkdir -p /root/.ssh
cat > /root/.ssh/config << 'SSHEOF'
Host *
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
SSHEOF

chmod 600 /root/.ssh/config

# Start ttyd with the wrapper script
# Pass command as argument so it can be overridden
exec ttyd -p 7681 "$@" /tmp/ttyd-wrapper.sh
