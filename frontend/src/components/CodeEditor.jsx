
import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { X, Plus } from 'lucide-react';

export default function CodeEditor({ code, setCode, currentLine }) {
  const editorRef = useRef(null);
  const decorationRef = useRef([]);

  const [editorTheme, setEditorTheme] = useState(
    document.documentElement.classList.contains('dark')
      ? 'vs-dark'
      : 'light'
  );

  // Detect dark/light theme changes
  useEffect(() => {
    const root = document.documentElement;

    const observer = new MutationObserver(() => {
      setEditorTheme(
        root.classList.contains('dark') ? 'vs-dark' : 'light'
      );
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Store Monaco editor instance
  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  // Highlight currently executing line
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;

    decorationRef.current = editor.deltaDecorations(
      decorationRef.current,
      currentLine > 0
        ? [
            {
              range: new window.monaco.Range(
                currentLine,
                1,
                currentLine,
                1
              ),
              options: {
                isWholeLine: true,
                className: 'codeviz-current-line',
                glyphMarginClassName: 'codeviz-line-glyph',
              },
            },
          ]
        : []
    );

    if (currentLine > 0) {
      editor.revealLineInCenter(currentLine);
    }
  }, [currentLine]);

  return (
    <div className="codeviz-panel flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 border-b dark:border-dark-border border-light-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-viz-accent/10 border-t border-x dark:border-viz-accent/30 border-viz-accent/30 text-viz-accent text-sm font-medium">
          <span className="text-orange-500">☕</span>
          Main.java
          <button className="ml-1 hover:bg-viz-accent/20 rounded p-0.5">
            <X size={12} />
          </button>
        </div>

        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5">
          <Plus size={16} />
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Editor
          height="100%"
          language="java"
          theme={editorTheme}
          value={code}
          onChange={(value) => setCode(value ?? '')}
          onMount={handleEditorMount}
          options={{
            automaticLayout: true,
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace',
            lineHeight: 24,
            tabSize: 4,
            insertSpaces: true,
            minimap: {
              enabled: false,
            },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            padding: {
              top: 16,
              bottom: 16,
            },
            renderLineHighlight: 'none',
            glyphMargin: true,
            folding: true,
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>
    </div>
  );
}
