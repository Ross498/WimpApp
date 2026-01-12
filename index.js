
// Deployment entry point for WIMP Kitchen Companion
const { spawn } = require('child_process');

console.log('🚀 Starting WIMP Kitchen Companion server...');

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});
