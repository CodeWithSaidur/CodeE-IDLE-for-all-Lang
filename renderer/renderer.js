/* ════════════════════════════════════════════════════════════
   SCode Renderer – renderer.js
   ════════════════════════════════════════════════════════════ */

'use strict';

// ── State ────────────────────────────────────────────────────
let currentLanguage = 'Python';
let currentFilePath = null;
let isDirty = false;
let fontSize = 14;
let showLineNumbers = true;
let wordWrap = false;

// ── Templates ────────────────────────────────────────────────
const TEMPLATES = {
    Python: `# Python - Hello World
print("Hello, World! From Python")

# Example: simple functions
def greet(name):
    return f"Hello, {name}!"

names = ["Alice", "Bob", "Charlie"]
for name in names:
    print(greet(name))
`,
    C: `#include <stdio.h>

int main() {
    printf("Hello, World! From C\\n");

    // Loop example
    for (int i = 1; i <= 5; i++) {
        printf("Count: %d\\n", i);
    }

    return 0;
}
`,
    'C++': `#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello, World! From C++" << std::endl;

    std::vector<std::string> names = {"Alice", "Bob", "Charlie"};
    for (const auto& name : names) {
        std::cout << "Hello, " << name << "!" << std::endl;
    }

    return 0;
}
`,
    'C#': `using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World! From C#");

        var names = new List<string> { "Alice", "Bob", "Charlie" };
        foreach (var name in names) {
            Console.WriteLine($"Hello, {name}!");
        }
    }
}
`,
    Java: `import java.util.Arrays;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World! From Java");

        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
        for (String name : names) {
            System.out.println("Hello, " + name + "!");
        }
    }
}
`,
    JavaScript: `// JavaScript - Hello World
console.log("Hello, World! From JavaScript");

// Example: arrow functions & array methods
const names = ["Alice", "Bob", "Charlie"];
names.forEach(name => {
    console.log(\`Hello, \${name}!\`);
});

// Async example
async function fetchData() {
    return "async data";
}
fetchData().then(data => console.log(data));
`,
    PHP: `<?php
echo "Hello, World! From PHP\\n";

// Example: arrays and loops
$names = ["Alice", "Bob", "Charlie"];
foreach ($names as $name) {
    echo "Hello, $name!\\n";
}

// Functions
function greet($name) {
    return "Greetings, $name!";
}
echo greet("World") . "\\n";
?>
`,
    HTML: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Hello, World! From HTML</title>
    <style>
        body {
            font-family: sans-serif;
            background: #0f0f1a;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        h1 { color: #a78bfa; }
    </style>
</head>
<body>
    <div>
        <h1>Hello, World! From HTML</h1>
        <p>This is a sample HTML page from SCode.</p>
    </div>
</body>
</html>
`,
};

// ── Language config ──────────────────────────────────────────
const LANG_CONFIG = {
    Python: { ext: 'py', dot: '#3572A5', label: 'Python' },
    C: { ext: 'c', dot: '#555555', label: 'C' },
    'C++': { ext: 'cpp', dot: '#f34b7d', label: 'C++' },
    'C#': { ext: 'cs', dot: '#178600', label: 'C#' },
    Java: { ext: 'java', dot: '#b07219', label: 'Java' },
    JavaScript: { ext: 'js', dot: '#f1e05a', label: 'JavaScript' },
    PHP: { ext: 'php', dot: '#4F5D95', label: 'PHP' },
    HTML: { ext: 'html', dot: '#e34c26', label: 'HTML' },
};

// ── DOM refs ─────────────────────────────────────────────────
const editor = document.getElementById('codeEditor');
const highlight = document.getElementById('syntaxHighlight');
const lineNumbers = document.getElementById('lineNumbers');
const terminalOutput = document.getElementById('terminalOutput');
const terminalInput = document.getElementById('terminalInput');
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

// ══════════════════════════════════════
// Init
// ══════════════════════════════════════
function init() {
    setLanguage('Python', false);
    editor.value = TEMPLATES['Python'];
    updateAll();
    setupEventListeners();
    setupMenus();
    setupResizeHandle();
    setupTerminalIPC();
    setupKeyboardShortcuts();
    editor.focus();
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
    tabName.textContent = currentFilePath
        ? currentFilePath.split(/[\\/]/).pop()
        : `untitled.${cfg.ext}`;
    fileTitle.textContent = currentFilePath
        ? currentFilePath.split(/[\\/]/).pop()
        : `untitled.${cfg.ext}`;
    document.title = `SCode – ${cfg.label}`;

    // Highlight lang buttons in sidebar & dropdown
    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
    });
    document.querySelectorAll('.lang-item').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
    });

    if (applyTemplate) {
        editor.value = TEMPLATES[lang] || '';
        isDirty = false;
        updateAll();
    }
    updateSyntax();
}

// ══════════════════════════════════════
// Update helpers
// ══════════════════════════════════════
function updateAll() {
    updateSyntax();
    updateLineNumbers();
    updateCursorPos();
}

function updateLineNumbers() {
    if (!showLineNumbers) {
        lineNumbers.style.display = 'none';
        return;
    }
    lineNumbers.style.display = '';
    const lines = editor.value.split('\n');
    lineNumbers.textContent = lines.map((_, i) => i + 1).join('\n');
    statusLines.textContent = `${lines.length} Lines`;
}

function updateCursorPos() {
    const val = editor.value;
    const pos = editor.selectionStart;
    const linesBeforeCursor = val.substring(0, pos).split('\n');
    const line = linesBeforeCursor.length;
    const col = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1;
    statusCursor.textContent = `Ln ${line}, Col ${col}`;
}

// ══════════════════════════════════════
// Syntax Highlighting (hand-rolled tokenizer)
// ══════════════════════════════════════
const LANG_RULES = {
    Python: [
        { cls: 'tok-comment', re: /(#.*)$/m },
        { cls: 'tok-string', re: /(\"{3}[\s\S]*?\"{3}|'{3}[\s\S]*?'{3}|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
        { cls: 'tok-decorator', re: /(@\w+)/ },
        { cls: 'tok-keyword', re: /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/ },
        { cls: 'tok-builtin', re: /\b(print|len|range|type|int|str|float|list|dict|set|tuple|bool|input|open|map|filter|zip|enumerate|sorted|reversed|abs|max|min|sum|any|all|hasattr|getattr|setattr|isinstance|issubclass|super|object|staticmethod|classmethod|property)\b/ },
        { cls: 'tok-number', re: /\b(0x[\da-fA-F]+|\d+\.?\d*([eE][+-]?\d+)?j?)\b/ },
        { cls: 'tok-function', re: /\b([a-zA-Z_]\w*)\s*(?=\()/ },
        { cls: 'tok-class', re: /\bclass\s+([A-Z]\w*)/ },
    ],
    JavaScript: [
        { cls: 'tok-comment', re: /(\/\/.*$|\/\*[\s\S]*?\*\/)/m },
        { cls: 'tok-string', re: /(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
        { cls: 'tok-keyword', re: /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield|async|await)\b/ },
        { cls: 'tok-builtin', re: /\b(console|document|window|Math|JSON|Array|Object|String|Number|Boolean|Promise|Map|Set|Symbol|Error|Date|RegExp|parseInt|parseFloat|isNaN|isFinite|setTimeout|setInterval|clearTimeout|clearInterval|fetch)\b/ },
        { cls: 'tok-number', re: /\b(0x[\da-fA-F]+|\d+\.?\d*([eE][+-]?\d+)?)\b/ },
        { cls: 'tok-function', re: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/ },
        { cls: 'tok-class', re: /\bclass\s+([A-Z]\w*)/ },
        { cls: 'tok-decorator', re: /(@\w+)/ },
    ],
    C: [
        { cls: 'tok-preprocessor', re: /(#\s*(?:include|define|ifdef|ifndef|endif|pragma|undef|if|else|elif)\b.*)$/m },
        { cls: 'tok-comment', re: /(\/\/.*$|\/\*[\s\S]*?\*\/)/m },
        { cls: 'tok-string', re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
        { cls: 'tok-keyword', re: /\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/ },
        { cls: 'tok-number', re: /\b(0x[\da-fA-F]+[uUlL]*|\d+\.?\d*([eE][+-]?\d+)?[fFlL]?)\b/ },
        { cls: 'tok-function', re: /\b([a-zA-Z_]\w*)\s*(?=\()/ },
        { cls: 'tok-type', re: /\b(FILE|size_t|ptrdiff_t|intptr_t|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t|bool)\b/ },
    ],
    'C++': [
        { cls: 'tok-preprocessor', re: /(#\s*(?:include|define|ifdef|ifndef|endif|pragma|undef|if|else|elif)\b.*)$/m },
        { cls: 'tok-comment', re: /(\/\/.*$|\/\*[\s\S]*?\*\/)/m },
        { cls: 'tok-string', re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|R"\([\s\S]*?\)")/ },
        { cls: 'tok-keyword', re: /\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq|override|final)\b/ },
        { cls: 'tok-number', re: /\b(0x[\da-fA-F]+[uUlL]*|\d+\.?\d*([eE][+-]?\d+)?[fFlL]?)\b/ },
        { cls: 'tok-function', re: /\b([a-zA-Z_]\w*)\s*(?=\()/ },
        { cls: 'tok-class', re: /\bclass\s+([A-Z]\w*)/ },
    ],
    'C#': [
        { cls: 'tok-comment', re: /(\/\/.*$|\/\*[\s\S]*?\*\/)|(\/\/\/.*$)/m },
        { cls: 'tok-string', re: /(@"(?:[^"]|"")*"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
        { cls: 'tok-decorator', re: /(\[\w+(?:\(.*?\))?\])/ },
        { cls: 'tok-keyword', re: /\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|while|async|await|yield|nameof|dynamic|when)\b/ },
        { cls: 'tok-number', re: /\b(0x[\da-fA-F]+[uUlL]*|\d+\.?\d*([eE][+-]?\d+)?[fFdDmM]?)\b/ },
        { cls: 'tok-function', re: /\b([a-zA-Z_]\w*)\s*(?=\()/ },
        { cls: 'tok-class', re: /\b(class|interface|struct|enum)\s+([A-Z]\w*)/ },
    ],
    Java: [
        { cls: 'tok-comment', re: /(\/\/.*$|\/\*[\s\S]*?\*\/)/m },
        { cls: 'tok-string', re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
        { cls: 'tok-keyword', re: /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|true|false|try|void|volatile|while|var|record|sealed|permits|yield)\b/ },
        { cls: 'tok-number', re: /\b(0x[\da-fA-F]+[lL]?|\d+\.?\d*([eE][+-]?\d+)?[fFdDlL]?)\b/ },
        { cls: 'tok-function', re: /\b([a-zA-Z_]\w*)\s*(?=\()/ },
        { cls: 'tok-class', re: /\b(class|interface|enum|record)\s+([A-Z]\w*)/ },
    ],
    PHP: [
        { cls: 'tok-comment', re: /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/m },
        { cls: 'tok-string', re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
        { cls: 'tok-keyword', re: /\b(abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|null|or|print|private|protected|public|require|require_once|return|static|switch|throw|trait|true|false|try|unset|use|var|while|xor|yield)\b/ },
        { cls: 'tok-variable', re: /(\$[a-zA-Z_]\w*)/ },
        { cls: 'tok-number', re: /\b(0x[\da-fA-F]+|\d+\.?\d*([eE][+-]?\d+)?)\b/ },
        { cls: 'tok-function', re: /\b([a-zA-Z_]\w*)\s*(?=\()/ },
    ],
    HTML: [
        { cls: 'tok-comment', re: /(<!--[\s\S]*?-->)/ },
        { cls: 'tok-string', re: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/ },
        { cls: 'tok-tag', re: /(<\/?\s*[\w-]+)/ },
        { cls: 'tok-attr-name', re: /\b([\w-]+)\s*=/ },
        { cls: 'tok-operator', re: /(<\/?|\/?>)/ },
    ],
};

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function updateSyntax() {
    const code = editor.value;
    const rules = LANG_RULES[currentLanguage] || [];
    const escaped = escapeHtml(code);

    // Build HTML by applying rules sequentially via a segment approach
    // We tokenize by splitting the string based on regex matches
    let html = tokenize(code, rules);
    html = html.replace(/\n/g, '\n'); // ensure newlines preserved
    highlight.innerHTML = html + '\n'; // trailing newline for caret position

    // Sync scroll
    syncScroll();
}

function tokenize(code, rules) {
    if (!rules.length) return escapeHtml(code);

    let result = '';
    let remaining = code;

    while (remaining.length > 0) {
        let earliest = null;
        let earliestIdx = Infinity;
        let earliestRule = null;
        let earliestMatch = null;

        for (const rule of rules) {
            const match = rule.re.exec(remaining);
            if (match && match.index < earliestIdx) {
                earliestIdx = match.index;
                earliest = match[0];
                earliestRule = rule;
                earliestMatch = match;
            }
        }

        if (!earliest) {
            result += escapeHtml(remaining);
            break;
        }

        // Text before the match
        if (earliestIdx > 0) {
            result += escapeHtml(remaining.substring(0, earliestIdx));
        }

        // The match
        result += `<span class="${earliestRule.cls}">${escapeHtml(earliest)}</span>`;
        remaining = remaining.substring(earliestIdx + earliest.length);
    }

    return result;
}

function syncScroll() {
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
    lineNumbers.scrollTop = editor.scrollTop;
}

// ══════════════════════════════════════
// Event listeners
// ══════════════════════════════════════
function setupEventListeners() {
    // Editor input
    editor.addEventListener('input', () => {
        isDirty = true;
        updateAll();
        updateTabDirty();
    });

    editor.addEventListener('keydown', (e) => {
        // Tab → insert 4 spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 4;
            updateAll();
        }
        // Auto-close brackets
        const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
        if (pairs[e.key]) {
            e.preventDefault();
            const s = editor.selectionStart;
            const selected = editor.value.substring(s, editor.selectionEnd);
            const ins = e.key + selected + pairs[e.key];
            document.execCommand('insertText', false, ins);
            editor.selectionStart = editor.selectionEnd = s + 1;
            updateAll();
        }
    });

    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('click', updateCursorPos);
    editor.addEventListener('keyup', updateCursorPos);

    // Ctrl + scroll → zoom
    editor.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) adjustFontSize(1);
            else adjustFontSize(-1);
        }
    }, { passive: false });
}

function updateTabDirty() {
    const dot = isDirty ? '● ' : '';
    tabName.textContent = dot + (currentFilePath
        ? currentFilePath.split(/[\\/]/).pop()
        : `untitled.${LANG_CONFIG[currentLanguage].ext}`);
}

// ══════════════════════════════════════
// Menus
// ══════════════════════════════════════
function setupMenus() {
    // Toggle dropdown on click
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

    // Close menus on outside click
    document.addEventListener('click', closeAllMenus);

    // File menu
    document.getElementById('btnOpen').addEventListener('click', openFile);
    document.getElementById('btnSave').addEventListener('click', saveFile);
    document.getElementById('btnSaveAs').addEventListener('click', saveFileAs);
    document.getElementById('btnExit').addEventListener('click', () => window.electronAPI.windowClose());

    // Tools menu
    document.getElementById('btnRun').addEventListener('click', runCode);
    document.getElementById('btnKill').addEventListener('click', killProcess);
    document.getElementById('btnClear').addEventListener('click', clearTerminal);
    document.getElementById('btnWordWrap').addEventListener('click', toggleWordWrap);
    document.getElementById('btnLineNum').addEventListener('click', toggleLineNumbers);

    // Language menu (in menu bar)
    document.querySelectorAll('.lang-item').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.dataset.lang, true);
            closeAllMenus();
        });
    });

    // Language buttons in sidebar
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang, true));
    });

    // Download links
    document.querySelectorAll('[data-url]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.electronAPI.openUrl(btn.dataset.url);
            closeAllMenus();
        });
    });

    // Terminal header buttons
    document.getElementById('termRun').addEventListener('click', runCode);
    document.getElementById('termKill').addEventListener('click', killProcess);
    document.getElementById('termClear').addEventListener('click', clearTerminal);
    document.getElementById('btnRunSidebar').addEventListener('click', runCode);

    // Terminal tabs
    document.getElementById('termTabOutput').addEventListener('click', () => switchTermTab('output'));
    document.getElementById('termTabInput').addEventListener('click', () => switchTermTab('input'));

    // Terminal input send
    document.getElementById('termSendBtn').addEventListener('click', sendTerminalInput);
    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) sendTerminalInput();
    });

    // Tab close
    document.getElementById('tabCloseBtn').addEventListener('click', () => {
        editor.value = '';
        currentFilePath = null;
        isDirty = false;
        updateAll();
        updateTabDirty();
    });

    // New tab (reset)
    document.getElementById('newTabBtn').addEventListener('click', () => {
        editor.value = TEMPLATES[currentLanguage] || '';
        currentFilePath = null;
        isDirty = false;
        updateAll();
        updateTabDirty();
    });

    // Window controls
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
    const inputPanel = document.getElementById('terminalInputPanel');
    const tabOut = document.getElementById('termTabOutput');
    const tabIn = document.getElementById('termTabInput');
    if (tab === 'output') {
        outputPanel.classList.remove('hidden');
        inputPanel.classList.add('hidden');
        tabOut.classList.add('active');
        tabIn.classList.remove('active');
    } else {
        outputPanel.classList.add('hidden');
        inputPanel.classList.remove('hidden');
        tabIn.classList.add('active');
        tabOut.classList.remove('active');
    }
}

// ══════════════════════════════════════
// File operations
// ══════════════════════════════════════
async function openFile() {
    closeAllMenus();
    const result = await window.electronAPI.openFile();
    if (!result) return;
    editor.value = result.content;
    currentFilePath = result.filePath;
    isDirty = false;

    // Auto-detect language from extension
    const ext = result.filePath.split('.').pop().toLowerCase();
    const extMap = { py: 'Python', c: 'C', cpp: 'C++', cs: 'C#', java: 'Java', js: 'JavaScript', php: 'PHP', html: 'HTML' };
    if (extMap[ext]) setLanguage(extMap[ext], false);

    updateAll();
    updateTabDirty();
    showToast(`Opened: ${result.filePath.split(/[\\/]/).pop()}`);
}

async function saveFile() {
    closeAllMenus();
    const content = editor.value;
    const filePath = await window.electronAPI.saveFile({ filePath: currentFilePath, content });
    if (!filePath) return;
    currentFilePath = filePath;
    isDirty = false;
    updateTabDirty();
    showToast(`Saved: ${filePath.split(/[\\/]/).pop()}`);
}

async function saveFileAs() {
    closeAllMenus();
    const content = editor.value;
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
    const code = editor.value;
    termStatus.textContent = 'Running';
    termStatus.className = 'term-status running';

    // Switch to output tab
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

function clearTerminal() {
    closeAllMenus();
    terminalOutput.innerHTML = '';
}

function sendTerminalInput() {
    const text = terminalInput.value;
    if (!text.trim()) return;
    window.electronAPI.sendTerminalInput(text + '\n');
    terminalInput.value = '';
}

// ══════════════════════════════════════
// Terminal IPC
// ══════════════════════════════════════
function setupTerminalIPC() {
    window.electronAPI.onTerminalOutput(({ data, isError }) => {
        const cls = isError ? 'term-error' : '';
        // Detect exit message
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
        if (e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); killProcess(); }
        if (e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); clearTerminal(); }
        if (e.ctrlKey && e.key === '=') { e.preventDefault(); adjustFontSize(1); }
        if (e.ctrlKey && e.key === '-') { e.preventDefault(); adjustFontSize(-1); }
        if (e.ctrlKey && e.key === '0') { e.preventDefault(); setFontSize(14); }
    });
}

// ══════════════════════════════════════
// Font/zoom
// ══════════════════════════════════════
function adjustFontSize(delta) {
    setFontSize(fontSize + delta);
}
function setFontSize(size) {
    fontSize = Math.max(8, Math.min(32, size));
    const pct = Math.round((fontSize / 14) * 100);
    editor.style.fontSize = fontSize + 'px';
    highlight.style.fontSize = fontSize + 'px';
    lineNumbers.style.fontSize = fontSize + 'px';
    editor.style.lineHeight = '1.7';
    highlight.style.lineHeight = '1.7';
    lineNumbers.style.lineHeight = '1.7';
    statusZoom.textContent = pct + '%';
    updateLineNumbers();
}

// ══════════════════════════════════════
// Word wrap / Line numbers toggles
// ══════════════════════════════════════
function toggleWordWrap() {
    wordWrap = !wordWrap;
    const wrapVal = wordWrap ? 'pre-wrap' : 'pre';
    editor.style.whiteSpace = wrapVal;
    highlight.style.whiteSpace = wrapVal;
    editor.style.overflowWrap = wordWrap ? 'break-word' : 'normal';
    showToast(`Word wrap ${wordWrap ? 'ON' : 'OFF'}`);
}

function toggleLineNumbers() {
    showLineNumbers = !showLineNumbers;
    lineNumbers.style.display = showLineNumbers ? '' : 'none';
    showToast(`Line numbers ${showLineNumbers ? 'ON' : 'OFF'}`);
}

// ══════════════════════════════════════
// Resize handle
// ══════════════════════════════════════
function setupResizeHandle() {
    const handle = document.getElementById('resizeHandle');
    const termPanel = document.getElementById('terminalPanel');
    const editorArea = document.getElementById('editorWrapper');
    let dragging = false;
    let startY, startH;

    handle.addEventListener('mousedown', (e) => {
        dragging = true;
        startY = e.clientY;
        startH = termPanel.offsetHeight;
        handle.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const delta = startY - e.clientY;
        const newH = Math.max(80, Math.min(600, startH + delta));
        termPanel.style.height = newH + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// ══════════════════════════════════════
// Toast
// ══════════════════════════════════════
let toastTimer;
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ══════════════════════════════════════
// Start
// ══════════════════════════════════════
init();
