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
    Ruby: `# Ruby - Hello World\nputs "Hello, World! From Ruby"\n\nnames = ["Alice", "Bob", "Charlie"]\nnames.each do |name|\n  puts "Hello, #{name}!"\nend\n`,
    Go: `// Go - Hello World\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World! From Go")\n    names := []string{"Alice", "Bob", "Charlie"}\n    for _, name := range names {\n        fmt.Printf("Hello, %s!\\n", name)\n    }\n}\n`,
    Rust: `// Rust - Hello World\nfn main() {\n    println!("Hello, World! From Rust");\n    let names = vec!["Alice", "Bob", "Charlie"];\n    for name in names {\n        println!("Hello, {}!", name);\n    }\n}\n`,
    Swift: `// Swift - Hello World\nprint("Hello, World! From Swift")\n\nlet names = ["Alice", "Bob", "Charlie"]\nfor name in names {\n    print("Hello, \\(name)!")\n}\n`,
    Kotlin: `// Kotlin - Hello World\nfun main() {\n    println("Hello, World! From Kotlin")\n    val names = listOf("Alice", "Bob", "Charlie")\n    for (name in names) {\n        println("Hello, $name!")\n    }\n}\n`,
    Dart: `// Dart - Hello World\nvoid main() {\n  print('Hello, World! From Dart');\n  var names = ['Alice', 'Bob', 'Charlie'];\n  for (var name in names) {\n    print('Hello, $name!');\n  }\n}\n`,
    TypeScript: `// TypeScript - Hello World\nconst greet = (name: string): string => {\n    return \`Hello, \${name}!\`;\n};\n\nconsole.log("Hello from SCode (TypeScript)");\nconst names: string[] = ["Alice", "Bob", "Charlie"];\nnames.forEach(name => console.log(greet(name)));\n`,
    'Bash/Shell': `#!/bin/bash\n# Bash - Hello World\necho "Hello, World! From Bash"\n\nnames=("Alice" "Bob" "Charlie")\nfor name in "\${names[@]}"; do\n    echo "Hello, $name!"\ndone\n`,
    PowerShell: `# PowerShell - Hello World\nWrite-Host "Hello, World! From PowerShell"\n\n$names = "Alice", "Bob", "Charlie"\nforeach ($name in $names) {\n    Write-Host "Hello, $name!"\n}\n`,
    Assembly: `; Assembly (x86-64) - Hello World\nsection .data\n    msg db 'Hello, World!', 0xA\n    len equ $ - msg\n\nsection .text\n    global _start\n\n_start:\n    mov rax, 1          ; sys_write\n    mov rdi, 1          ; stdout\n    mov rsi, msg\n    mov rdx, len\n    syscall\n\n    mov rax, 60         ; sys_exit\n    xor rdi, rdi\n    syscall\n`,
    Fortran: `! Fortran - Hello World\nprogram hello\n    print *, "Hello, World! From Fortran"\nend program hello\n`,
    Lisp: `;; Lisp - Hello World\n(format t "Hello, World! From Lisp~%")\n\n(defun greet (name)\n  (format t "Hello, ~A!~%" name))\n\n(mapcar #'greet '("Alice" "Bob" "Charlie"))\n`,
    Lua: `-- Lua - Hello World\nprint("Hello, World! From Lua")\n\nlocal names = {"Alice", "Bob", "Charlie"}\nfor _, name in ipairs(names) do\n    print("Hello, " .. name .. "!")\nend\n`,
    R: `# R - Hello World\ncat("Hello, World! From R\\n")\n\nnames <- c("Alice", "Bob", "Charlie")\nfor (name in names) {\n    cat(paste("Hello, ", name, "!\\n", sep=""))\n}\n`,
    Groovy: `// Groovy - Hello World\nprintln "Hello, World! From Groovy"\n\ndef names = ["Alice", "Bob", "Charlie"]\nnames.each { println "Hello, $it!" }\n`,
    MATLAB: `% MATLAB - Hello World\ndisp('Hello, World! From MATLAB');\n\nnames = {'Alice', 'Bob', 'Charlie'};\nfor i = 1:length(names)\n    fprintf('Hello, %s!\\n', names{i});\nend\n`,
    Perl: `# Perl - Hello World\nprint "Hello, World! From Perl\\n";\n\nmy @names = ("Alice", "Bob", "Charlie");\nforeach my $name (@names) {\n    print "Hello, $name!\\n";\n}\n`,
    Scala: `object HelloWorld {\n  fun main(args: Array[String]) {\n    println("Hello, World! From Scala")\n    val names = List("Alice", "Bob", "Charlie")\n    names.foreach(name => println(s"Hello, $name!"))\n  }\n}\n`,
    Zig: `const std = @import("std");\n\npub fn main() !void {\n    const stdout = std.io.getStdOut().writer();\n    try stdout.print("Hello, World! From Zig\\n", .{});\n}\n`,
    Elixir: `IO.puts "Hello, World! From Elixir"\n\nnames = ["Alice", "Bob", "Charlie"]\nEnum.each(names, fn name -> IO.puts "Hello, #{name}!" end)\n`,
    Erlang: `-module(hello).\n-export([hello_world/0]).\n\nhello_world() ->\n    io:format("Hello, World! From Erlang~n").\n`,
    Ada: `with Ada.Text_IO; use Ada.Text_IO;\nprocedure Hello is\nbegin\n    Put_Line ("Hello, World! From Ada");\nend Hello;\n`,
    'F#': `printfn "Hello, World! From F#"\n\nlet names = ["Alice"; "Bob"; "Charlie"]\nnames |> List.iter (printfn "Hello, %s!")\n`,
    OCaml: `print_endline "Hello, World! From OCaml";;\n\nlet names = ["Alice"; "Bob"; "Charlie"] in\nList.iter (fun name -> print_endline ("Hello, " ^ name ^ "!")) names;;\n`,
    Prolog: `:- initialization(main).\nmain :- write('Hello, World! From Prolog'), nl, halt.\n`,
    COBOL: `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. HELLO-WORLD.\n       PROCEDURE DIVISION.\n           DISPLAY 'Hello, World! From COBOL'.\n           STOP RUN.\n`,
    Binary: `01001000 01100101 01101100 01101100 01101111 00100000 01010111 01101111 01110010 01101100 01100100\n`,
};

// ── Language mapping for Monaco ──────────────────────────────
const MONACO_LANGS = {
    Python: 'python',
    C: 'c',
    'C++': 'cpp',
    'C#': 'csharp',
    Java: 'java',
    JavaScript: 'javascript',
    TypeScript: 'typescript',
    PHP: 'php',
    HTML: 'html',
    SQL: 'sql',
    Ruby: 'ruby',
    Go: 'go',
    Rust: 'rust',
    Swift: 'swift',
    Kotlin: 'kotlin',
    Dart: 'dart',
    'Bash/Shell': 'shell',
    PowerShell: 'powershell',
    Assembly: 'asm',
    Fortran: 'fortran',
    Lisp: 'lisp',
    Lua: 'lua',
    R: 'r',
    Groovy: 'groovy',
    MATLAB: 'matlab',
    Perl: 'perl',
    Scala: 'scala',
    Zig: 'zig',
    Elixir: 'elixir',
    Erlang: 'erlang',
    Ada: 'ada',
    'F#': 'fsharp',
    OCaml: 'ocaml',
    Prolog: 'prolog',
    COBOL: 'cobol',
    Binary: 'plaintext',
    Delphi: 'pascal',
    VBA: 'vb',
    GDScript: 'python',
    MicroPython: 'python',
    Mojo: 'python'
};

const LANG_CONFIG = {
    Python: { ext: 'py', dot: '#3572A5', label: 'Python' },
    C: { ext: 'c', dot: '#555555', label: 'C' },
    'C++': { ext: 'cpp', dot: '#f34b7d', label: 'C++' },
    'C#': { ext: 'cs', dot: '#178600', label: 'C#' },
    Java: { ext: 'java', dot: '#b07219', label: 'Java' },
    JavaScript: { ext: 'js', dot: '#f1e05a', label: 'JavaScript' },
    TypeScript: { ext: 'ts', dot: '#3178c6', label: 'TypeScript' },
    PHP: { ext: 'php', dot: '#4F5D95', label: 'PHP' },
    HTML: { ext: 'html', dot: '#e34c26', label: 'HTML' },
    SQL: { ext: 'sql', dot: '#e38c00', label: 'SQL' },
    Ruby: { ext: 'rb', dot: '#701516', label: 'Ruby' },
    Go: { ext: 'go', dot: '#00ADD8', label: 'Go' },
    Rust: { ext: 'rs', dot: '#dea584', label: 'Rust' },
    Swift: { ext: 'swift', dot: '#F05138', label: 'Swift' },
    Kotlin: { ext: 'kt', dot: '#A97BFF', label: 'Kotlin' },
    Dart: { ext: 'dart', dot: '#00B4AB', label: 'Dart' },
    'Bash/Shell': { ext: 'sh', dot: '#89e051', label: 'Bash/Shell' },
    PowerShell: { ext: 'ps1', dot: '#012456', label: 'PowerShell' },
    Assembly: { ext: 'asm', dot: '#6E4C13', label: 'Assembly' },
    Fortran: { ext: 'f', dot: '#4d41b1', label: 'Fortran' },
    Lisp: { ext: 'lisp', dot: '#3fb68b', label: 'Lisp' },
    Lua: { ext: 'lua', dot: '#000080', label: 'Lua' },
    R: { ext: 'r', dot: '#198CE7', label: 'R' },
    Groovy: { ext: 'groovy', dot: '#427819', label: 'Groovy' },
    MATLAB: { ext: 'm', dot: '#e16737', label: 'MATLAB' },
    Perl: { ext: 'pl', dot: '#0298c3', label: 'Perl' },
    Scala: { ext: 'scala', dot: '#c22d40', label: 'Scala' },
    Zig: { ext: 'zig', dot: '#ec915c', label: 'Zig' },
    Elixir: { ext: 'ex', dot: '#6e4a7e', label: 'Elixir' },
    Erlang: { ext: 'erl', dot: '#B83998', label: 'Erlang' },
    Ada: { ext: 'ada', dot: '#02f88d', label: 'Ada' },
    'F#': { ext: 'fs', dot: '#b845fc', label: 'F#' },
    OCaml: { ext: 'ml', dot: '#ef7a08', label: 'OCaml' },
    Prolog: { ext: 'pl', dot: '#74283c', label: 'Prolog' },
    COBOL: { ext: 'cob', dot: '#005ca5', label: 'COBOL' },
    Binary: { ext: 'bin', dot: '#7f8c8d', label: 'Binary' },
    Delphi: { ext: 'pas', dot: '#B0171F', label: 'Delphi' },
    VBA: { ext: 'vba', dot: '#867db1', label: 'VBA' },
    GDScript: { ext: 'gd', dot: '#355570', label: 'GDScript' },
    MicroPython: { ext: 'py', dot: '#3776AB', label: 'MicroPython' },
    Mojo: { ext: 'mojo', dot: '#ff4b11', label: 'Mojo' }
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
    const langs = ['Python', 'C', 'Cpp', 'CSharp', 'Java', 'JavaScript', 'TypeScript', 'PHP', 'HTML', 'SQL', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Dart', 'Bash/Shell', 'PowerShell', 'Assembly', 'Fortran', 'Lisp', 'Lua', 'R', 'Groovy', 'MATLAB', 'Perl', 'Scala', 'Zig', 'Elixir', 'Erlang', 'Ada', 'FSharp', 'OCaml', 'Prolog', 'COBOL'];
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

    document.getElementById('btnBinaryConv').addEventListener('click', openBinaryModal);
    document.getElementById('closeBinaryModal').addEventListener('click', closeBinaryModal);
    document.getElementById('btnTxtToBin').addEventListener('click', textToBinary);
    document.getElementById('btnBinToTxt').addEventListener('click', binaryToText);
    document.getElementById('btnApplyToEditor').addEventListener('click', applyBinaryToEditor);

    document.getElementById('closeAlertModal').addEventListener('click', () => document.getElementById('alertModal').classList.add('hidden'));
    document.getElementById('btnAlertOk').addEventListener('click', () => document.getElementById('alertModal').classList.add('hidden'));

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

// ── Binary Converter Logic ────────────────────────────
function openBinaryModal() {
    closeAllMenus();
    document.getElementById('binaryModal').classList.remove('hidden');
    document.getElementById('convText').value = monacoEditor.getValue();
    document.getElementById('convText').focus();
}

function closeBinaryModal() {
    document.getElementById('binaryModal').classList.add('hidden');
}

function textToBinary() {
    const text = document.getElementById('convText').value;
    const binary = text.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join(' ');
    document.getElementById('convBinary').value = binary;
}

function binaryToText() {
    const binary = document.getElementById('convBinary').value;
    try {
        const text = binary.split(/\s+/).map(bin => {
            if (!bin) return '';
            return String.fromCharCode(parseInt(bin, 2));
        }).join('');
        document.getElementById('convText').value = text;
    } catch (e) {
        showToast('Invalid binary format!');
    }
}

function applyBinaryToEditor() {
    const binary = document.getElementById('convBinary').value;
    const text = document.getElementById('convText').value;
    // Use binary if focused/filled, else text
    const result = binary || text;
    if (result) {
        monacoEditor.setValue(result);
        isDirty = true;
        updateTabDirty();
    }
    closeBinaryModal();
    showToast('Applied to editor');
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
    const extMap = {
        py: 'Python', c: 'C', cpp: 'C++', cs: 'C#', java: 'Java', js: 'JavaScript', ts: 'TypeScript', php: 'PHP', html: 'HTML', sql: 'SQL',
        rb: 'Ruby', go: 'Go', rs: 'Rust', swift: 'Swift', kt: 'Kotlin', dart: 'Dart', sh: 'Bash/Shell', ps1: 'PowerShell',
        asm: 'Assembly', f: 'Fortran', lisp: 'Lisp', lua: 'Lua', r: 'R', groovy: 'Groovy', m: 'MATLAB', pl: 'Perl',
        scala: 'Scala', zig: 'Zig', ex: 'Elixir', erl: 'Erlang', ada: 'Ada', fs: 'F#', ml: 'OCaml', cob: 'COBOL', bin: 'Binary',
        pas: 'Delphi', vba: 'VBA', gd: 'GDScript', mojo: 'Mojo'
    };
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
// ── Terminal IPC ──────────────────────────────────────
function setupTerminalIPC() {
    window.electronAPI.onTerminalOutput(({ data, isError, isExit }) => {
        const cls = isError ? 'term-error' : '';
        if (isExit) {
            termStatus.textContent = 'Idle';
            termStatus.className = 'term-status';
        }

        // If it's the "Tip" we added, show it as a popup too
        if (data.includes('💡 Tip: Maske sure') || data.includes('Make sure') && data.includes('environment variable')) {
            showAlert('Setup Required', data.trim());
        }

        appendTerminal(data, cls);
    });
}

function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message.replace('💡 Tip: ', '');
    document.getElementById('alertModal').classList.remove('hidden');
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
