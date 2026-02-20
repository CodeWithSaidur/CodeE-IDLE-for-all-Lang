const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const os = require('os');

let mainWindow;
let runningProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0f0f1a',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Window controls ──────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ── File operations ──────────────────────────────────────────────────────────
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'All Supported', extensions: ['py', 'c', 'cpp', 'cs', 'java', 'html', 'js', 'php', 'txt'] },
      { name: 'Python', extensions: ['py'] },
      { name: 'C', extensions: ['c'] },
      { name: 'C++', extensions: ['cpp'] },
      { name: 'C#', extensions: ['cs'] },
      { name: 'Java', extensions: ['java'] },
      { name: 'HTML', extensions: ['html'] },
      { name: 'JavaScript', extensions: ['js'] },
      { name: 'PHP', extensions: ['php'] },
      { name: 'Text', extensions: ['txt'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf8');
  return { filePath, content };
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  if (!filePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Python', extensions: ['py'] },
        { name: 'C', extensions: ['c'] },
        { name: 'C++', extensions: ['cpp'] },
        { name: 'C#', extensions: ['cs'] },
        { name: 'Java', extensions: ['java'] },
        { name: 'HTML', extensions: ['html'] },
        { name: 'JavaScript', extensions: ['js'] },
        { name: 'PHP', extensions: ['php'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });
    if (result.canceled) return null;
    filePath = result.filePath;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
});

ipcMain.handle('save-file-as', async (event, { content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Python', extensions: ['py'] },
      { name: 'C', extensions: ['c'] },
      { name: 'C++', extensions: ['cpp'] },
      { name: 'C#', extensions: ['cs'] },
      { name: 'Java', extensions: ['java'] },
      { name: 'HTML', extensions: ['html'] },
      { name: 'JavaScript', extensions: ['js'] },
      { name: 'PHP', extensions: ['php'] },
      { name: 'Text', extensions: ['txt'] },
    ],
  });
  if (result.canceled) return null;
  fs.writeFileSync(result.filePath, content, 'utf8');
  return result.filePath;
});

// ── Code execution ───────────────────────────────────────────────────────────
const tmpDir = os.tmpdir();

function sendOutput(data, isError = false) {
  if (mainWindow) {
    mainWindow.webContents.send('terminal-output', { data: data.toString(), isError });
  }
}

function runProcess(cmd, args, options = {}) {
  if (runningProcess) {
    try { runningProcess.kill(); } catch (e) {}
    runningProcess = null;
  }

  sendOutput(`\n▶ Running: ${cmd} ${args.join(' ')}\n`);

  runningProcess = spawn(cmd, args, { shell: true, cwd: tmpDir, ...options });

  runningProcess.stdout.on('data', (data) => sendOutput(data.toString()));
  runningProcess.stderr.on('data', (data) => sendOutput(data.toString(), true));
  runningProcess.on('close', (code) => {
    sendOutput(`\n✓ Process exited with code ${code}\n`);
    runningProcess = null;
  });
  runningProcess.on('error', (err) => {
    sendOutput(`\n✗ Error: ${err.message}\n`, true);
    runningProcess = null;
  });
}

ipcMain.handle('run-code', async (event, { language, code }) => {
  const isWin = process.platform === 'win32';

  if (language === 'Python') {
    const file = path.join(tmpDir, 'temp.py');
    fs.writeFileSync(file, code);
    runProcess(isWin ? 'python' : 'python3', [file]);
  } else if (language === 'C') {
    const src = path.join(tmpDir, 'temp.c');
    const out = path.join(tmpDir, isWin ? 'temp_c.exe' : 'temp_c');
    fs.writeFileSync(src, code);
    const compile = spawn('gcc', [src, '-o', out], { shell: true });
    compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
    compile.on('close', (c) => {
      if (c === 0) runProcess(out, []);
      else sendOutput(`\n✗ Compilation failed.\n`, true);
    });
  } else if (language === 'C++') {
    const src = path.join(tmpDir, 'temp.cpp');
    const out = path.join(tmpDir, isWin ? 'temp_cpp.exe' : 'temp_cpp');
    fs.writeFileSync(src, code);
    const compile = spawn('g++', [src, '-o', out], { shell: true });
    compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
    compile.on('close', (c) => {
      if (c === 0) runProcess(out, []);
      else sendOutput(`\n✗ Compilation failed.\n`, true);
    });
  } else if (language === 'C#') {
    const src = path.join(tmpDir, 'Program.cs');
    const out = path.join(tmpDir, isWin ? 'Program.exe' : 'Program');
    fs.writeFileSync(src, code);
    const compile = spawn('csc', [src], { shell: true, cwd: tmpDir });
    compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
    compile.on('close', (c) => {
      if (c === 0) runProcess(isWin ? out : 'mono', isWin ? [] : [out]);
      else sendOutput(`\n✗ Compilation failed.\n`, true);
    });
  } else if (language === 'Java') {
    const src = path.join(tmpDir, 'Main.java');
    fs.writeFileSync(src, code);
    const compile = spawn('javac', [src], { shell: true, cwd: tmpDir });
    compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
    compile.on('close', (c) => {
      if (c === 0) runProcess('java', ['-cp', tmpDir, 'Main']);
      else sendOutput(`\n✗ Compilation failed.\n`, true);
    });
  } else if (language === 'JavaScript') {
    const file = path.join(tmpDir, 'temp.js');
    fs.writeFileSync(file, code);
    runProcess('node', [file]);
  } else if (language === 'PHP') {
    const file = path.join(tmpDir, 'temp.php');
    fs.writeFileSync(file, code);
    runProcess('php', [file]);
  } else if (language === 'HTML') {
    const file = path.join(tmpDir, 'temp.html');
    fs.writeFileSync(file, code);
    shell.openExternal('file://' + file);
    sendOutput('\n▶ Opened in browser\n');
  }
  return true;
});

ipcMain.on('kill-process', () => {
  if (runningProcess) {
    runningProcess.kill();
    runningProcess = null;
    sendOutput('\n⏹ Process killed by user\n');
  }
});

ipcMain.on('terminal-input', (event, data) => {
  if (runningProcess && runningProcess.stdin) {
    runningProcess.stdin.write(data);
  }
});

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});
