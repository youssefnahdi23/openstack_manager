#!/usr/bin/env node
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

const WRAPPER_PORT = 7681;
const TTYD_BASE_PORT = 8000;
const TTYD_BINARY = '/usr/local/bin/ttyd';
const SESSIONS = new Map();

// Setup SSH keys
function setupSSH() {
  const homeDir = os.homedir();
  const sshDir = path.join(homeDir, '.ssh');
  
  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { mode: 0o700, recursive: true });
  }
  
  const keyPath = path.join(sshDir, 'id_rsa');
  if (!fs.existsSync(keyPath)) {
    spawnSync('ssh-keygen', ['-t', 'rsa', '-N', '', '-f', keyPath], { stdio: 'ignore' });
  }
  
  const configPath = path.join(sshDir, 'config');
  fs.writeFileSync(configPath, `Host *
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
  ConnectTimeout 5
`, { mode: 0o600 });
}

function waitForPort(port, host = '127.0.0.1', timeout = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = net.createConnection({ host, port }, () => {
        socket.destroy();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for port ${port}`));
        } else {
          setTimeout(tryConnect, 100);
        }
      });
    };

    tryConnect();
  });
}

function attachTtydLogging(proc, targetLabel) {
  if (!proc.stdout || !proc.stderr) return;

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk) => {
    process.stdout.write(`[ttyd ${targetLabel} stdout] ${chunk}`);
  });

  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (chunk) => {
    process.stderr.write(`[ttyd ${targetLabel} stderr] ${chunk}`);
  });
}

// Get or create ttyd process for SSH target
async function getTtydPort(target, user = 'ubuntu') {
  const sessionId = `ssh_${target}_${user}`;
  
  if (SESSIONS.has(sessionId)) {
    const session = SESSIONS.get(sessionId);
    if (session.proc && !session.proc.killed) {
      await waitForPort(session.port).catch(() => {});
      return session.port;
    }
    SESSIONS.delete(sessionId);
  }

  let port = TTYD_BASE_PORT;
  while ([...SESSIONS.values()].some(s => s.port === port)) {
    port++;
  }
  
  const sshCmd = `exec ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 "${user}@${target}" || bash -i`;

  
  const ttydProc = spawn(TTYD_BINARY, [
    '-p', String(port),
    '--writable',
    'bash', '-c', sshCmd
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  attachTtydLogging(ttydProc, target);
  ttydProc.unref();
  
  ttydProc.on('error', (err) => {
    console.error(`ttyd process error: ${err}`);
    SESSIONS.delete(sessionId);
  });
  
  ttydProc.on('exit', (code, signal) => {
    console.log(`ttyd for ${target} exited (code=${code}, signal=${signal})`);
    SESSIONS.delete(sessionId);
  });
  
  SESSIONS.set(sessionId, { proc: ttydProc, port, target, createdAt: Date.now() });
  console.log(`Created ttyd for SSH to ${target} on port ${port}`);

  try {
    await waitForPort(port);
  } catch (err) {
    console.error(`Failed to start ttyd for ${target} on port ${port}:`, err.message);
    if (ttydProc && !ttydProc.killed) {
      ttydProc.kill();
    }
    SESSIONS.delete(sessionId);
    throw err;
  }
  
  return port;
}

// Get or create local ttyd
async function getLocalTtydPort() {
  if (SESSIONS.has('local')) {
    const session = SESSIONS.get('local');
    if (session.proc && !session.proc.killed) {
      await waitForPort(session.port).catch(() => {});
      return session.port;
    }
  }
  
  const port = TTYD_BASE_PORT;
  const ttydProc = spawn(TTYD_BINARY, ['-p', String(port), '--writable', 'bash'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  attachTtydLogging(ttydProc, 'local');
  ttydProc.unref();
  SESSIONS.set('local', { proc: ttydProc, port });
  console.log(`Local ttyd on port ${port}`);

  try {
    await waitForPort(port);
  } catch (err) {
    console.error(`Failed to start local ttyd on port ${port}:`, err.message);
    if (ttydProc && !ttydProc.killed) {
      ttydProc.kill();
    }
    SESSIONS.delete('local');
    throw err;
  }
  
  return port;
}

// HTTP server
const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://localhost`);
    const target = urlObj.searchParams.get('target');
    const user = urlObj.searchParams.get('user') || 'ubuntu';
    urlObj.searchParams.delete('target');
    urlObj.searchParams.delete('user');
    let targetPath = urlObj.pathname + urlObj.search;
    if (!targetPath) targetPath = '/';

    const targetPort = target ? await getTtydPort(target, user) : await getLocalTtydPort();
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: targetPort,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${targetPort}`
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(502);
      res.end('Bad Gateway');
    });
    
    req.pipe(proxyReq);
  } catch (err) {
    console.error('Request handling error:', err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

// Handle WebSocket upgrades
server.on('upgrade', async (req, socket, head) => {
  try {
    const urlObj = new URL(req.url, `http://localhost`);
    const target = urlObj.searchParams.get('target');
    const user = urlObj.searchParams.get('user') || 'ubuntu';
    urlObj.searchParams.delete('target');
    urlObj.searchParams.delete('user');
    let targetPath = urlObj.pathname + urlObj.search;
    if (!targetPath) targetPath = '/';

    const targetPort = target ? await getTtydPort(target, user) : await getLocalTtydPort();
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: targetPort,
      path: targetPath,
      method: 'GET',
      headers: {
        ...req.headers,
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        host: `127.0.0.1:${targetPort}`
      }
    });

    proxyReq.on('upgrade', (proxyRes, proxySocket) => {
      socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        (proxyRes.headers['sec-websocket-accept'] ? `Sec-WebSocket-Accept: ${proxyRes.headers['sec-websocket-accept']}\r\n` : '') +
        '\r\n');

      proxySocket.pipe(socket);
      socket.pipe(proxySocket);

      proxySocket.on('error', () => socket.destroy());
      socket.on('error', () => proxySocket.destroy());
    });

    proxyReq.on('error', (err) => {
      console.error('WebSocket proxy error:', err);
      socket.destroy();
    });

    proxyReq.end();
  } catch (err) {
    console.error('WebSocket handling error:', err);
    socket.destroy();
  }
});

// Cleanup old sessions periodically (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000;
  
  for (const [id, session] of SESSIONS.entries()) {
    if (session.createdAt && (now - session.createdAt) > maxAge && id !== 'local') {
      if (session.proc && !session.proc.killed) {
        session.proc.kill();
      }
      SESSIONS.delete(id);
      console.log(`Cleaned up expired session: ${id}`);
    }
  }
}, 60000);

setupSSH();
getLocalTtydPort(); // Start local ttyd immediately

server.listen(WRAPPER_PORT, '0.0.0.0', () => {
  console.log(`ttyd SSH wrapper listening on port ${WRAPPER_PORT}`);
  console.log(`Local bash: http://localhost:${WRAPPER_PORT}`);
  console.log(`SSH to IP: http://localhost:${WRAPPER_PORT}?target=<ip>&user=<username>`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  SESSIONS.forEach(session => {
    if (session.proc) session.proc.kill();
  });
  server.close(() => process.exit(0));
});
