const { spawn } = require('child_process');
const { createServer, build } = require('vite');
const path = require('path');
const electron = require('electron');

/**
 * 开发启动脚本
 * 1. 启动 Vite dev server
 * 2. 等待 dev server 就绪
 * 3. 启动 Electron 并加载 dev server URL
 */
async function startDev() {
  const root = path.resolve(__dirname, '..');

  // 启动 Vite dev server
  const server = await createServer({
    configFile: path.resolve(root, 'vite.config.ts'),
    root: path.resolve(root, 'src/renderer'),
  });

  await server.listen();

  const address = server.httpServer.address();
  const url = typeof address === 'string'
    ? address
    : `http://localhost:${address.port}`;

  console.log(`[dev] Vite dev server running at: ${url}`);

  // 启动 Electron
  const electronPath = typeof electron === 'string'
    ? electron
    : electron.default || electron;

  const electronProcess = spawn(
    electronPath,
    [path.resolve(root, 'dist/main/index.js')],
    {
      cwd: root,
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: url,
        NODE_ENV: 'development',
      },
      stdio: 'inherit',
    },
  );

  electronProcess.on('close', (code) => {
    console.log(`[dev] Electron process exited with code ${code}`);
    server.close();
    process.exit(code || 0);
  });

  electronProcess.on('error', (err) => {
    console.error('[dev] Failed to start Electron:', err);
    server.close();
    process.exit(1);
  });
}

startDev().catch((err) => {
  console.error('[dev] Error:', err);
  process.exit(1);
});
