const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function startPythonBackend() {
  const pythonPath = 'python';
  const backendScript = path.join(__dirname, '..', 'backend', 'main.py');
  
  pythonProcess = spawn(pythonPath, ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: path.join(__dirname, '..'),
    shell: true
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python Engine] ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Engine Error] ${data}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#07090E',
    title: 'ViralClip AI - Opus Studio & YouTube Auto-Poster',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // Load backend URL with built frontend
  setTimeout(() => {
    mainWindow.loadURL('http://127.0.0.1:8000').catch(() => {
      mainWindow.loadURL('http://127.0.0.1:8000');
    });
  }, 1500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
