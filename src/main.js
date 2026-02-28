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
            webviewTag: true,
        },
        titleBarStyle: 'hidden',
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Header interceptor to allow embedding (strips X-Frame-Options and CSP)
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };
        Object.keys(responseHeaders).forEach(header => {
            if (header.toLowerCase() === 'x-frame-options' || header.toLowerCase() === 'content-security-policy') {
                delete responseHeaders[header];
            }
        });
        callback({
            cancel: false,
            responseHeaders,
        });
    });

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
            { name: 'All Supported', extensions: ['py', 'c', 'cpp', 'cs', 'java', 'html', 'js', 'ts', 'php', 'sql', 'rb', 'go', 'rs', 'swift', 'kt', 'dart', 'sh', 'ps1', 'asm', 'f', 'lisp', 'lua', 'r', 'groovy', 'm', 'pl', 'scala', 'zig', 'ex', 'erl', 'ada', 'fs', 'ml', 'cob', 'bin', 'txt'] },
            { name: 'Python', extensions: ['py'] },
            { name: 'C', extensions: ['c'] },
            { name: 'C++', extensions: ['cpp'] },
            { name: 'C#', extensions: ['cs'] },
            { name: 'Java', extensions: ['java'] },
            { name: 'JavaScript', extensions: ['js'] },
            { name: 'TypeScript', extensions: ['ts'] },
            { name: 'Ruby', extensions: ['rb'] },
            { name: 'Go', extensions: ['go'] },
            { name: 'Rust', extensions: ['rs'] },
            { name: 'Swift', extensions: ['swift'] },
            { name: 'Kotlin', extensions: ['kt'] },
            { name: 'Dart', extensions: ['dart'] },
            { name: 'Bash', extensions: ['sh'] },
            { name: 'PowerShell', extensions: ['ps1'] },
            { name: 'HTML', extensions: ['html'] },
            { name: 'PHP', extensions: ['php'] },
            { name: 'SQL', extensions: ['sql'] },
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
                { name: 'JavaScript', extensions: ['js'] },
                { name: 'TypeScript', extensions: ['ts'] },
                { name: 'Ruby', extensions: ['rb'] },
                { name: 'Go', extensions: ['go'] },
                { name: 'Rust', extensions: ['rs'] },
                { name: 'HTML', extensions: ['html'] },
                { name: 'PHP', extensions: ['php'] },
                { name: 'SQL', extensions: ['sql'] },
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
            { name: 'JavaScript', extensions: ['js'] },
            { name: 'TypeScript', extensions: ['ts'] },
            { name: 'Ruby', extensions: ['rb'] },
            { name: 'Go', extensions: ['go'] },
            { name: 'Rust', extensions: ['rs'] },
            { name: 'HTML', extensions: ['html'] },
            { name: 'PHP', extensions: ['php'] },
            { name: 'SQL', extensions: ['sql'] },
            { name: 'Text', extensions: ['txt'] },
        ],
    });
    if (result.canceled) return null;
    fs.writeFileSync(result.filePath, content, 'utf8');
    return result.filePath;
});

// ── Code execution ───────────────────────────────────────────────────────────
const tmpDir = os.tmpdir();

function sendOutput(data, isError = false, isExit = false) {
    if (mainWindow) {
        mainWindow.webContents.send('terminal-output', { data: data.toString(), isError, isExit });
    }
}

function runProcess(cmd, args, language, options = {}) {
    if (runningProcess) {
        try { runningProcess.kill(); } catch (e) { }
        runningProcess = null;
    }

    sendOutput(`\n▶ Running: ${cmd} ${args.join(' ')}\n`);

    runningProcess = spawn(cmd, args, { shell: true, cwd: tmpDir, ...options });

    runningProcess.stdout.on('data', (data) => sendOutput(data.toString()));
    runningProcess.stderr.on('data', (data) => sendOutput(data.toString(), true));
    runningProcess.on('close', (code) => {
        sendOutput(`\n✓ Process exited with code ${code}\n`, false, true);
        runningProcess = null;
    });
    runningProcess.on('error', (err) => {
        sendOutput(`\n✗ Error: ${err.message}\n`, true);
        sendOutput(`\n💡 Tip: Make sure ${language} is installed and set as an environment variable.\n`, true, true);
        runningProcess = null;
    });
}

ipcMain.handle('run-code', async (event, { language, code }) => {
    const isWin = process.platform === 'win32';

    if (language === 'Python') {
        const file = path.join(tmpDir, 'temp.py');
        fs.writeFileSync(file, code);
        runProcess(isWin ? 'python' : 'python3', [file], language);
    } else if (language === 'C') {
        const src = path.join(tmpDir, 'temp.c');
        const out = path.join(tmpDir, isWin ? 'temp_c.exe' : 'temp_c');
        fs.writeFileSync(src, code);
        const compile = spawn('gcc', [src, '-o', out], { shell: true });
        compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
        compile.on('close', (c) => {
            if (c === 0) runProcess(out, [], language);
            else sendOutput(`\n✗ Compilation failed.\n`, true, true);
        });
    } else if (language === 'C++') {
        const src = path.join(tmpDir, 'temp.cpp');
        const out = path.join(tmpDir, isWin ? 'temp_cpp.exe' : 'temp_cpp');
        fs.writeFileSync(src, code);
        const compile = spawn('g++', [src, '-o', out], { shell: true });
        compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
        compile.on('close', (c) => {
            if (c === 0) runProcess(out, [], language);
            else sendOutput(`\n✗ Compilation failed.\n`, true, true);
        });
    } else if (language === 'C#') {
        const src = path.join(tmpDir, 'main.cs');
        fs.writeFileSync(src, code);
        runProcess('dotnet', ['run', src], language);
    } else if (language === 'Java') {
        const src = path.join(tmpDir, 'Main.java');
        fs.writeFileSync(src, code);
        const compile = spawn('javac', [src], { shell: true, cwd: tmpDir });
        compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
        compile.on('close', (c) => {
            if (c === 0) runProcess('java', ['-cp', tmpDir, 'Main'], language);
            else sendOutput(`\n✗ Compilation failed.\n`, true);
        });
    } else if (language === 'JavaScript') {
        const file = path.join(tmpDir, 'temp.js');
        fs.writeFileSync(file, code);
        runProcess('bun', [file], language);
    } else if (language === 'PHP') {
        const file = path.join(tmpDir, 'temp.php');
        fs.writeFileSync(file, code);
        runProcess('php', [file], language);
    } else if (language === 'Ruby') {
        const file = path.join(tmpDir, 'temp.rb');
        fs.writeFileSync(file, code);
        runProcess('ruby', [file], language);
    } else if (language === 'Go') {
        const file = path.join(tmpDir, 'temp.go');
        fs.writeFileSync(file, code);
        runProcess('go', ['run', file], language);
    } else if (language === 'Rust') {
        const src = path.join(tmpDir, 'temp.rs');
        const out = path.join(tmpDir, isWin ? 'temp_rs.exe' : 'temp_rs');
        fs.writeFileSync(src, code);
        const compile = spawn('rustc', [src, '-o', out], { shell: true });
        compile.stderr.on('data', (d) => sendOutput(d.toString(), true));
        compile.on('close', (c) => {
            if (c === 0) runProcess(out, [], language);
            else sendOutput(`\n✗ Compilation failed.\n`, true, true);
        });
    } else if (language === 'TypeScript') {
        const file = path.join(tmpDir, 'temp.ts');
        fs.writeFileSync(file, code);
        runProcess('bun', [file], language);
    } else if (language === 'Bash/Shell') {
        const file = path.join(tmpDir, 'temp.sh');
        fs.writeFileSync(file, code);
        runProcess(isWin ? 'bash' : 'sh', [file], language);
    } else if (language === 'PowerShell') {
        const file = path.join(tmpDir, 'temp.ps1');
        fs.writeFileSync(file, code);
        runProcess('powershell', ['-File', file], language);
    } else if (language === 'Scala') {
        const file = path.join(tmpDir, 'temp.scala');
        fs.writeFileSync(file, code);
        runProcess('scala', [file], language);
    } else if (language === 'Perl') {
        const file = path.join(tmpDir, 'temp.pl');
        fs.writeFileSync(file, code);
        runProcess('perl', [file], language);
    } else if (language === 'R') {
        const file = path.join(tmpDir, 'temp.r');
        fs.writeFileSync(file, code);
        runProcess('Rscript', [file], language);
    } else if (language === 'Lua') {
        const file = path.join(tmpDir, 'temp.lua');
        fs.writeFileSync(file, code);
        runProcess('lua', [file], language);
    } else if (language === 'Mojo') {
        const file = path.join(tmpDir, 'temp.mojo');
        fs.writeFileSync(file, code);
        runProcess('mojo', ['run', file], language);
    } else if (language === 'MicroPython') {
        const file = path.join(tmpDir, 'temp.py');
        fs.writeFileSync(file, code);
        runProcess('python', [file], language);
    } else if (language === 'Kotlin') {
        const src = path.join(tmpDir, 'temp.kt');
        fs.writeFileSync(src, code);
        runProcess('kotlinc', ['-script', src], language);
    } else if (language === 'Swift') {
        const src = path.join(tmpDir, 'temp.swift');
        fs.writeFileSync(src, code);
        runProcess('swift', [src], language);
    } else if (language === 'Dart') {
        const src = path.join(tmpDir, 'temp.dart');
        fs.writeFileSync(src, code);
        runProcess('dart', ['run', src], language);
    } else if (language === 'Groovy') {
        const src = path.join(tmpDir, 'temp.groovy');
        fs.writeFileSync(src, code);
        runProcess('groovy', [src], language);
    } else if (language === 'Elixir') {
        const src = path.join(tmpDir, 'temp.ex');
        fs.writeFileSync(src, code);
        runProcess('elixir', [src], language);
    } else if (language === 'Zig') {
        const src = path.join(tmpDir, 'temp.zig');
        fs.writeFileSync(src, code);
        runProcess('zig', ['run', src], language);
    } else if (language === 'Binary') {
        try {
            const decoded = code.split(/\s+/).map(bin => {
                if (!bin) return '';
                return String.fromCharCode(parseInt(bin, 2));
            }).join('');
            sendOutput(`\n▶ Binary Decoded Output:\n${decoded}\n`, false, true);
        } catch (e) {
            sendOutput(`\n✗ Error: Invalid binary format for decoding.\n`, true, true);
        }
    } else if (language === 'HTML') {
        const file = path.join(tmpDir, 'temp.html');
        fs.writeFileSync(file, code);
        shell.openExternal('file://' + file);
        sendOutput('\n▶ Opened in browser\n', false, true);
    } else if (language === 'SQL') {
        shell.openExternal('http://localhost/phpmyadmin/index.php?route=/server/sql');
        sendOutput('\n▶ Opened phpMyAdmin in browser\n', false, true);
    } else {
        sendOutput(`\n⚠ SCode: Execution for ${language} is not yet implemented or requires custom setup.\n`, true, true);
    }
    return true;
});

ipcMain.on('kill-process', () => {
    if (runningProcess) {
        runningProcess.kill();
        runningProcess = null;
        sendOutput('\n⏹ Process killed by user\n', false, true);
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
