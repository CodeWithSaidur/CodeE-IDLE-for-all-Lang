const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    windowMinimize: () => ipcRenderer.send('window-minimize'),
    windowMaximize: () => ipcRenderer.send('window-maximize'),
    windowClose: () => ipcRenderer.send('window-close'),

    // File ops
    openFile: () => ipcRenderer.invoke('open-file'),
    saveFile: (args) => ipcRenderer.invoke('save-file', args),
    saveFileAs: (args) => ipcRenderer.invoke('save-file-as', args),

    // Code execution
    runCode: (args) => ipcRenderer.invoke('run-code', args),
    killProcess: () => ipcRenderer.send('kill-process'),
    sendTerminalInput: (data) => ipcRenderer.send('terminal-input', data),

    // Terminal output listener
    onTerminalOutput: (callback) => {
        ipcRenderer.on('terminal-output', (event, data) => callback(data));
    },

    // Open URL in browser
    openUrl: (url) => ipcRenderer.send('open-url', url),
});
