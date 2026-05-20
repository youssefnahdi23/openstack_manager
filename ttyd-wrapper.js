#!/usr/bin/env node
/**
 * ttyd SSH Wrapper
 * Intercepts requests with ?target=<ip> and proxies to ttyd with SSH connection
 */

const http = require('http');
const { spawn } = require('child_process');
const url = require('url');
const fs = require('fs');
const path = require('path');

const TTYD_PORT = 8681; // Internal ttyd port
const WRAPPER_PORT = 7681; // External port

// Store active SSH sessions
const sessions = new Map();

// Ensure SSH keys exist
function ensureSSHKeys() {
  const sshDir = path.join(process.env.HOME || '/root', '.ssh');
  const keyPath = path.join(sshDir, 'id_rsa');
  
  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 });
  }
  
  if (!fs.existsSync(keyPath)) {
    try {
      require('child_process').execSync(
        `ssh-keygen -t rsa -N "" -f ${keyPath}`,
        { stdio: 'ignore' }
      );
    } catch (e) {
      console.error('Failed to generate SSH key:', e.message);
    }
  }
  
  // Create SSH config
  const configPath = path.join(sshDir, 'config');
  const config = `Host *
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
  LogLevel ERROR
  ConnectTimeout 5
`;
  fs.writeFileSync(configPath, config, { mode: 0o600 });
}

// Get or create ttyd instance for SSH target
async function getTtydPort(target) {
  const sessionKey = `ssh_${target}`;
  
  if (sessions.has(sessionKey)) {
    const session = sessions.get(sessionKey);
    if (session.process && !session.process.killed) {
      return session.port;
    }
  }
  
  // Find available port
  let port = TTYD_PORT + 1;
  while (sessions.values().some(s => s.port === port)) {
    port++;
  }
  
  console.log(`Starting ttyd for SSH to ${target} on port ${port}`);
  
  const users = ['ubuntu', 'root', 'debian', 'ec2-user'];
  const userStr = users.join(',');
  
  const ttydProcess = spawn('ttyd', [
    '-p', String(port),
    '-t', `SSH: ${target}`,
    'bash', '-c',
    `for user in ${userStr}; do ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 $user@${target} && exit 0; done; bash`
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  
  ttydProcess.on('error', (err) => {
    console.error(`ttyd error for ${target}:`, err);
    sessions.delete(sessionKey);
  });
  
  ttydProcess.on('exit', () => {
    console.log(`ttyd for ${target} exited`);
    sessions.delete(sessionKey);
  });
  
  sessions.set(sessionKey, { process: ttydProcess, port, target });
  
  // Wait a bit for ttyd to start
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return port;
}

// Create proxy server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const targetIp = parsedUrl.query.target;
  
  if (targetIp) {
    // SSH connection requested
    try {
      const ttydPort = await getTtydPort(targetIp);
      const proxyUrl = `http://localhost:${ttydPort}${parsedUrl.pathname}${parsedUrl.search.replace(/[?&]?target=[^&]*/, '')}`;
      
      console.log(`Proxying to ${proxyUrl}`);
      
      // Proxy the request
      const proxyReq = http.request(proxyUrl, {
        method: req.method,
        headers: req.headers
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
      console.error('Error handling request:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  } else {
    // Local bash shell
    try {
      const ttydPort = await getTtydPort('local');
      const proxyUrl = `http://localhost:${TTYD_PORT}${req.url}`;
      
      const proxyReq = http.request(proxyUrl, {
        method: req.method,
        headers: req.headers
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
      console.error('Error handling request:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

// Handle WebSocket upgrades
server.on('upgrade', async (req, socket, head) => {
  const parsedUrl = url.parse(req.url, true);
  const targetIp = parsedUrl.query.target;
  
  try {
    const ttydPort = targetIp ? await getTtydPort(targetIp) : TTYD_PORT;
    const proxyUrl = `ws://localhost:${ttydPort}${parsedUrl.pathname}`;
    
    console.log(`WebSocket upgrade to ${proxyUrl}`);
    
    const http = require('http');
    const WebSocket = require('ws');
    
    const ws = new WebSocket(proxyUrl.replace('ws://', 'http://'), {
      headers: req.headers
    });
    
    ws.on('open', () => {
      socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        '\r\n');
    });
    
    ws.on('message', (data) => {
      socket.write(data);
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      socket.destroy();
    });
    
    socket.on('data', (data) => {
      try {
        ws.send(data);
      } catch (e) {
        // WebSocket already closed
      }
    });
  } catch (err) {
    console.error('WebSocket upgrade error:', err);
    socket.destroy();
  }
});

// Ensure SSH keys on startup
ensureSSHKeys();

// Start local ttyd for fallback
const localTtyd = spawn('ttyd', ['-p', String(TTYD_PORT), 'bash'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

localTtyd.on('error', (err) => {
  console.error('Local ttyd error:', err);
});

// Start wrapper server
server.listen(WRAPPER_PORT, '0.0.0.0', () => {
  console.log(`ttyd SSH wrapper listening on port ${WRAPPER_PORT}`);
  console.log(`Local bash available at http://localhost:${WRAPPER_PORT}`);
  console.log(`SSH to instance available at http://localhost:${WRAPPER_PORT}?target=<ip>`);
});

// Cleanup on exit
process.on('exit', () => {
  localTtyd.kill();
  sessions.forEach(session => {
    if (session.process) session.process.kill();
  });
});
