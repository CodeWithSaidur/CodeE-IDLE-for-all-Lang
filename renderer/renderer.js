/* ════════════════════════════════════════════════════════════
   SCode Renderer – renderer.js (Monaco Edition)
   ════════════════════════════════════════════════════════════ */

'use strict';

// ── State ────────────────────────────────────────────────────
let monacoEditor = null;
let currentLanguage = 'Python';
let currentFilePath = null;
let isDirty = false;
let fontSize = 14;
let KEYWORDS_DATA = {};

// ── Templates ────────────────────────────────────────────────
const TEMPLATES = {
    Python: `# Python - Hello World\nprint("Hello, World! From Python")\n\ndef greet(name):\n    return f"Hello, {name}!"\n\nnames = ["Alice", "Bob", "Charlie"]\nfor name in names:\n    print(greet(name))\n`,
    C: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World! From C\\n");\n    for (int i = 1; i <= 5; i++) {\n        printf("Count: %d\\n", i);\n    }\n    return 0;\n}\n`,
    'C++': `#include <iostream>\n#include <vector>\n#include <string>\n\nint main() {\n    std::cout << "Hello, World! From C++" << std::endl;\n    std::vector<std::string> names = {"Alice", "Bob", "Charlie"};\n    for (const auto& name : names) {\n        std::cout << "Hello, " << name << "!" << std::endl;\n    }\n    return 0;\n}\n`,
    'C#': `using System;\nusing System.Collections.Generic;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello from main.cs");\n        var names = new List<string> { "Alice", "Bob", "Charlie" };\n        foreach (var name in names) {\n            Console.WriteLine($"Hello, {name}!");\n        }\n    }\n}\n`,
    Java: `import java.util.Arrays;\nimport java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World! From Java");\n        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");\n        for (String name : names) {\n            System.out.println("Hello, " + name + "!");\n        }\n    }\n}\n`,
    JavaScript: `// JavaScript - Hello World\nconsole.log("Hello, World! From JavaScript");\n\nconst names = ["Alice", "Bob", "Charlie"];\nnames.forEach(name => {\n    console.log(\`Hello, \${name}!\`);\n});\n`,
    PHP: `<?php\necho "Hello, World! From PHP\\n";\n$names = ["Alice", "Bob", "Charlie"];\nforeach ($names as $name) {\n    echo "Hello, $name!\\n";\n}\n?>\n`,
    HTML: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8"/>\n    <title>Hello SCode</title>\n    <style>body { background: #0f0f1a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }</style>\n</head>\n<body>\n    <h1>Hello from SCode!</h1>\n</body>\n</html>\n`,
    SQL: `-- SQL Example\nSELECT 'Hello World' AS Greeting;\n\nCREATE TABLE IF NOT EXISTS users (\n    id INT AUTO_INCREMENT PRIMARY KEY,\n    name VARCHAR(100)\n);\n`,
};

// ── Language mapping for Monaco ──────────────────────────────
const MONACO_LANGS = {
    Python: 'python',
    C: 'c',
    'C++': 'cpp',
    'C#': 'csharp',
    Java: 'java',
    JavaScript: 'javascript',
    PHP: 'php',
    HTML: 'html',
    SQL: 'sql'
};

const LANG_CONFIG = {
    Python: { ext: 'py', dot: '#3572A5', label: 'Python' },
    C: { ext: 'c', dot: '#555555', label: 'C' },
    'C++': { ext: 'cpp', dot: '#f34b7d', label: 'C++' },
    'C#': { ext: 'cs', dot: '#178600', label: 'C#' },
    Java: { ext: 'java', dot: '#b07219', label: 'Java' },
    JavaScript: { ext: 'js', dot: '#f1e05a', label: 'JavaScript' },
    PHP: { ext: 'php', dot: '#4F5D95', label: 'PHP' },
    HTML: { ext: 'html', dot: '#e34c26', label: 'HTML' },
    SQL: { ext: 'sql', dot: '#e38c00', label: 'SQL' },
};

// ── DOM refs ─────────────────────────────────────────────────
const terminalOutput = document.getElementById('terminalOutput');
const terminalPanel = document.getElementById('terminalPanel');
const resizeHandle = document.getElementById('resizeHandle');
const termStatus = document.getElementById('termStatus');
const langBadge = document.getElementById('langBadge');
const fileTitle = document.getElementById('fileTitle');
const tabName = document.getElementById('tabName');
const tabDot = document.getElementById('tabDot');
const statusDot = document.getElementById('statusDot');
const statusLang = document.getElementById('statusLang');
const statusCursor = document.getElementById('statusCursor');
const statusLines = document.getElementById('statusLines');
const statusZoom = document.getElementById('statusZoom');
const toast = document.getElementById('toast');
const inputModal = document.getElementById('inputModal');
const modalInput = document.getElementById('modalInput');
const sqlView = document.getElementById('sqlView');
const sqlWebview = document.getElementById('sqlWebview');
const sqlRefresh = document.getElementById('sqlRefresh');

// ══════════════════════════════════════
// Init
// ══════════════════════════════════════
function init() {
    // Monaco Loader configuration
    require.config({ paths: { 'vs': '../node_modules/monaco-editor/min/vs' } });

    require(['vs/editor/editor.main'], function () {
        // Define Custom Theme
        monaco.editor.defineTheme('scode-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6272a4' },
                { token: 'keyword', foreground: 'bd93f9' },
                { token: 'string', foreground: 'f1fa8c' },
                { token: 'type', foreground: '8be9fd' },
                { token: 'function', foreground: '50fa7b' }
            ],
            colors: {
                'editor.background': '#111128',
                'editor.foreground': '#e2e8f0',
                'editorCursor.foreground': '#a78bfa',
                'editor.lineHighlightBackground': '#1c1c3a',
                'editorLineNumber.foreground': '#4b5563',
                'editorLineNumber.activeForeground': '#a78bfa',
                'editor.selectionBackground': '#7c3aed44',
                'editorIndentGuide.background': '#1c1c3a'
            }
        });

        monacoEditor = monaco.editor.create(document.getElementById('monacoContainer'), {
            value: TEMPLATES['Python'],
            language: 'python',
            theme: 'scode-dark',
            fontSize: fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            automaticLayout: true,
            minimap: { enabled: false },
            cursorBlink: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            roundedSelection: true,
            scrollBeyondLastLine: false,
            bracketPairColorization: { enabled: true }
        });

        // Event listeners for editor
        monacoEditor.onDidChangeModelContent(() => {
            if (!isDirty) {
                isDirty = true;
                updateTabDirty();
            }
            updateStatusBar();
        });

        monacoEditor.onDidChangeCursorPosition(() => {
            updateStatusBar();
        });

        setupMenus();
        setupResizeHandle();
        setupTerminalIPC();
        setupKeyboardShortcuts();
        setupMouseWheelZoom();
        setupWebviewHandlers();
        setLanguage('Python', false);
        initKeywords();
        updateStatusBar();

        // Add Monaco-specific commands for shortcuts
        monacoEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyR, () => runCode());
        monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveFile());
        monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => saveFileAs());
        monacoEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyI, () => openModal());
        monacoEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyK, () => killProcess());
        monacoEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyD, () => clearTerminal());
    });
}

/**
 * ── Keywords Algorithm ─────────────────────────────────────────
 * 1. Load from keywords dir
 * 2. Separate by language
 * 3. Supplement Monaco completions
 */
async function initKeywords() {
    const langs = ['Python', 'C', 'Cpp', 'CSharp', 'Java', 'JavaScript', 'PHP', 'HTML', 'SQL'];
    const promises = langs.map(async (lang) => {
        try {
            const response = await fetch(`./keywords/${lang}/keywords.json`);
            if (response.ok) {
                KEYWORDS_DATA[lang] = await response.json();
                registerMonacoCompletions(lang);
            }
        } catch (e) {
            console.warn(`Failed to load keywords for ${lang}:`, e);
        }
    });
    await Promise.all(promises);
}

function registerMonacoCompletions(lang) {
    const monacoLang = MONACO_LANGS[lang];
    if (!monacoLang) return;

    monaco.languages.registerCompletionItemProvider(monacoLang, {
        provideCompletionItems: (model, position) => {
            const data = KEYWORDS_DATA[lang];
            const suggestions = [];

            if (!data) return { suggestions: [] };

            // Add standard keywords
            if (data.keywords) {
                data.keywords.forEach(kw => {
                    suggestions.push({
                        label: kw,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: kw,
                        detail: `${lang} Keyword`
                    });
                });
            }

            // Add builtins/functions/tags
            if (data.builtins) {
                data.builtins.forEach(f => {
                    suggestions.push({
                        label: f,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: f,
                        detail: `${lang} Built-in`
                    });
                });
            }

            if (data.types) {
                data.types.forEach(t => {
                    suggestions.push({
                        label: t,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: t,
                        detail: `${lang} Type`
                    });
                });
            }

            if (data.tags) {
                data.tags.forEach(tag => {
                    suggestions.push({
                        label: tag,
                        kind: monaco.languages.CompletionItemKind.Property,
                        insertText: tag,
                        detail: `HTML Tag`
                    });
                });
            }

            if (data.attributes) {
                data.attributes.forEach(attr => {
                    suggestions.push({
                        label: attr,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: attr,
                        detail: `HTML Attribute`
                    });
                });
            }

            return { suggestions: suggestions };
        }
    });
}

function updateStatusBar() {
    if (!monacoEditor) return;
    const model = monacoEditor.getModel();
    const position = monacoEditor.getPosition();
    if (model && position) {
        statusCursor.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
        statusLines.textContent = `${model.getLineCount()} Lines`;
    }
}

function setupWebviewHandlers() {
    sqlWebview.addEventListener('did-fail-load', (e) => {
        if (e.errorCode === -3) return;
        console.warn('Webview failed to load:', e.validatedURL, e.errorDescription);
        if (currentLanguage === 'SQL') {
            showToast(`Error: Could not connect to SQL Monitor. Is XAMPP/MySQL running?`, 5000);
        }
    });
}

// ══════════════════════════════════════
// Language switching
// ══════════════════════════════════════
function setLanguage(lang, applyTemplate = true) {
    currentLanguage = lang;
    const cfg = LANG_CONFIG[lang];

    // Update UI
    langBadge.textContent = cfg.label;
    tabDot.style.background = cfg.dot;
    statusDot.style.background = cfg.dot;
    statusLang.innerHTML = `<span class="status-dot" style="background:${cfg.dot}"></span>${cfg.label}`;

    const fileName = currentFilePath
        ? currentFilePath.split(/[\\/]/).pop()
        : `untitled.${cfg.ext}`;

    tabName.textContent = fileName;
    fileTitle.textContent = fileName;
    document.title = `SCode – ${cfg.label}`;

    if (monacoEditor) {
        monaco.editor.setModelLanguage(monacoEditor.getModel(), MONACO_LANGS[lang] || 'plaintext');
        if (applyTemplate) {
            monacoEditor.setValue(TEMPLATES[lang] || '');
            isDirty = false;
            updateTabDirty();
        }
    }

    const isHtml = lang === 'HTML';
    const isSql = lang === 'SQL';

    terminalPanel.classList.toggle('terminal-hidden', isHtml || isSql);
    resizeHandle.style.display = (isHtml || isSql) ? 'none' : '';
    sqlView.classList.toggle('hidden', !isSql);

    if (isSql) {
        const targetUrl = 'http://localhost/phpmyadmin/index.php?route=/server/sql';
        if (!sqlWebview.src.startsWith(targetUrl)) {
            showToast('Loading SQL Monitor...');
            sqlWebview.src = targetUrl;
        }
    }

    document.querySelectorAll('.lang-item').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
    });
}

// ══════════════════════════════════════
// Event listeners
// ══════════════════════════════════════
function setupEventListeners() {
    // This is mostly replaced by monacoEditor event listeners in init()
}

function updateTabDirty() {
    const dot = isDirty ? '● ' : '';
    const name = currentFilePath
        ? currentFilePath.split(/[\\/]/).pop()
        : `untitled.${LANG_CONFIG[currentLanguage].ext}`;
    tabName.textContent = dot + name;
}

// ══════════════════════════════════════
// Menus
// ══════════════════════════════════════
function setupMenus() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const btn = item.querySelector('.menu-btn');
        const drop = item.querySelector('.dropdown');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = drop.classList.contains('open');
            closeAllMenus();
            if (!isOpen) {
                drop.classList.add('open');
                btn.classList.add('open');
            }
        });
    });

    document.addEventListener('click', closeAllMenus);

    document.getElementById('btnOpen').addEventListener('click', openFile);
    document.getElementById('btnSave').addEventListener('click', saveFile);
    document.getElementById('btnSaveAs').addEventListener('click', saveFileAs);
    document.getElementById('btnExit').addEventListener('click', () => window.electronAPI.windowClose());
    document.getElementById('btnRun').addEventListener('click', runCode);
    document.getElementById('btnKill').addEventListener('click', killProcess);
    document.getElementById('btnClear').addEventListener('click', clearTerminal);
    document.getElementById('btnWordWrap').addEventListener('click', toggleWordWrap);

    document.querySelectorAll('.lang-item').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang, true);
            closeAllMenus();
        });
    });

    document.querySelectorAll('[data-url]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.electronAPI.openUrl(btn.dataset.url);
            closeAllMenus();
        });
    });

    document.getElementById('termRun').addEventListener('click', runCode);
    document.getElementById('termKill').addEventListener('click', killProcess);
    document.getElementById('termClear').addEventListener('click', clearTerminal);
    document.getElementById('termDelete').addEventListener('click', deleteTerminal);
    document.getElementById('termTabOutput').addEventListener('click', () => switchTermTab('output'));
    document.getElementById('termInput').addEventListener('click', openModal);

    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelInput').addEventListener('click', closeModal);
    document.getElementById('confirmInput').addEventListener('click', () => {
        const text = modalInput.value;
        if (text) {
            window.electronAPI.sendTerminalInput(text + '\n');
            modalInput.value = '';
        }
        closeModal();
    });

    sqlRefresh.addEventListener('click', () => {
        sqlWebview.reload();
        showToast('Refreshing SQL Monitor...');
    });

    document.getElementById('tabCloseBtn').addEventListener('click', () => {
        monacoEditor.setValue('');
        currentFilePath = null;
        isDirty = false;
        updateTabDirty();
    });

    document.getElementById('btnMinimize').addEventListener('click', () => window.electronAPI.windowMinimize());
    document.getElementById('btnMaximize').addEventListener('click', () => window.electronAPI.windowMaximize());
    document.getElementById('btnClose').addEventListener('click', () => window.electronAPI.windowClose());
}

function closeAllMenus() {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('open'));
}

function switchTermTab(tab) {
    const outputPanel = document.getElementById('terminalOutput');
    const tabOut = document.getElementById('termTabOutput');
    if (tab === 'output') {
        terminalPanel.classList.remove('terminal-hidden');
        resizeHandle.style.display = '';
        outputPanel.classList.remove('hidden');
        tabOut.classList.add('active');
    }
}

function openModal() {
    inputModal.classList.remove('hidden');
    modalInput.focus();
}

function closeModal() {
    inputModal.classList.add('hidden');
}

// ══════════════════════════════════════
// File operations
// ══════════════════════════════════════
async function openFile() {
    closeAllMenus();
    const result = await window.electronAPI.openFile();
    if (!result) return;
    monacoEditor.setValue(result.content);
    currentFilePath = result.filePath;
    isDirty = false;

    const ext = result.filePath.split('.').pop().toLowerCase();
    const extMap = { py: 'Python', c: 'C', cpp: 'C++', cs: 'C#', java: 'Java', js: 'JavaScript', php: 'PHP', html: 'HTML' };
    if (extMap[ext]) setLanguage(extMap[ext], false);

    updateTabDirty();
    showToast(`Opened: ${result.filePath.split(/[\\/]/).pop()}`);
}

async function saveFile() {
    closeAllMenus();
    const content = monacoEditor.getValue();
    const filePath = await window.electronAPI.saveFile({ filePath: currentFilePath, content });
    if (!filePath) return;
    currentFilePath = filePath;
    isDirty = false;
    updateTabDirty();
    showToast(`Saved: ${filePath.split(/[\\/]/).pop()}`);
}

async function saveFileAs() {
    closeAllMenus();
    const content = monacoEditor.getValue();
    const filePath = await window.electronAPI.saveFileAs({ content });
    if (!filePath) return;
    currentFilePath = filePath;
    isDirty = false;
    updateTabDirty();
    showToast(`Saved as: ${filePath.split(/[\\/]/).pop()}`);
}

// ══════════════════════════════════════
// Code execution
// ══════════════════════════════════════
async function runCode() {
    closeAllMenus();
    const code = monacoEditor.getValue();
    termStatus.textContent = 'Running';
    termStatus.className = 'term-status running';
    switchTermTab('output');
    appendTerminal(`\n▶ Running ${currentLanguage} code…\n`, 'tok-info');
    await window.electronAPI.runCode({ language: currentLanguage, code });
}

function killProcess() {
    closeAllMenus();
    window.electronAPI.killProcess();
    termStatus.textContent = 'Idle';
    termStatus.className = 'term-status';
}

function deleteTerminal() {
    closeAllMenus();
    killProcess();
    terminalPanel.classList.add('terminal-hidden');
    resizeHandle.style.display = 'none';
    showToast('Terminal hidden');
}

function clearTerminal() {
    closeAllMenus();
    terminalOutput.innerHTML = '';
}

// ══════════════════════════════════════
// Terminal IPC
// ══════════════════════════════════════
function setupTerminalIPC() {
    window.electronAPI.onTerminalOutput(({ data, isError }) => {
        const cls = isError ? 'term-error' : '';
        if (data.includes('Process exited')) {
            termStatus.textContent = 'Idle';
            termStatus.className = 'term-status';
        }
        appendTerminal(data, cls);
    });
}

function appendTerminal(text, cls = '') {
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = text;
    terminalOutput.appendChild(span);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// ══════════════════════════════════════
// Keyboard shortcuts
// ══════════════════════════════════════
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'o') { e.preventDefault(); openFile(); }
        if (e.ctrlKey && e.key === 's' && !e.shiftKey) { e.preventDefault(); saveFile(); }
        if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); saveFileAs(); }
        if (e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); runCode(); }
        if (e.altKey && e.key.toLowerCase() === 'i') { e.preventDefault(); openModal(); }
        if (e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); killProcess(); }
        if (e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); clearTerminal(); }
        if (e.ctrlKey && e.key === '=') { e.preventDefault(); adjustFontSize(1); }
        if (e.ctrlKey && e.key === '-') { e.preventDefault(); adjustFontSize(-1); }
        if (e.ctrlKey && e.key === '0') { e.preventDefault(); setFontSize(14); }
    });
}

/**
 * ── Mouse Wheel Zoom ───────────────────────────────────────────
 */
function setupMouseWheelZoom() {
    // Window listener for UI areas outside the editor
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                adjustFontSize(1);
            } else if (e.deltaY > 0) {
                adjustFontSize(-1);
            }
        }
    }, { passive: false });

    // Monaco-specific listener for the code area
    if (monacoEditor) {
        monacoEditor.onMouseWheel((e) => {
            if (e.browserEvent.ctrlKey) {
                e.browserEvent.preventDefault();
                e.browserEvent.stopPropagation();
                if (e.deltaY < 0) {
                    adjustFontSize(1);
                } else if (e.deltaY > 0) {
                    adjustFontSize(-1);
                }
            }
        });
    }
}

function adjustFontSize(delta) {
    fontSize = Math.max(8, Math.min(32, fontSize + delta));
    if (monacoEditor) {
        monacoEditor.updateOptions({ fontSize: fontSize });
    }
    const pct = Math.round((fontSize / 14) * 100);
    statusZoom.textContent = pct + '%';
}

function setFontSize(size) {
    fontSize = size;
    if (monacoEditor) {
        monacoEditor.updateOptions({ fontSize: fontSize });
    }
    statusZoom.textContent = '100%';
}

function toggleWordWrap() {
    const currentWrap = monacoEditor.getOption(monaco.editor.EditorOption.wordWrap);
    const newWrap = currentWrap === 'on' ? 'off' : 'on';
    monacoEditor.updateOptions({ wordWrap: newWrap });
    showToast(`Word wrap ${newWrap === 'on' ? 'ON' : 'OFF'}`);
}

// ══════════════════════════════════════
// Resize handle
// ══════════════════════════════════════
function setupResizeHandle() {
    const handle = document.getElementById('resizeHandle');
    const termPanel = document.getElementById('terminalPanel');
    let dragging = false;
    let startX, startW;

    handle.addEventListener('mousedown', (e) => {
        dragging = true;
        startX = e.clientX;
        startW = termPanel.offsetWidth;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const delta = startX - e.clientX;
        const newW = Math.max(100, Math.min(800, startW + delta));
        termPanel.style.width = newW + 'px';
        if (monacoEditor) monacoEditor.layout();
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (monacoEditor) monacoEditor.layout();
    });
}

let toastTimer;
function showToast(msg, duration = 2500) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ══════════════════════════════════════
// Start
// ══════════════════════════════════════
init();
