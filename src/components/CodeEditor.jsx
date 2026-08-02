import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

export function CodeEditor({ value, onChange, onRun }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        keymap.of([{ key: "Mod-Enter", run: () => { onRun(); return true; } }]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { backgroundColor: "transparent", color: "#202124", fontSize: "14px" },
          ".cm-content": { padding: "12px 14px", fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace" },
          ".cm-gutters": { display: "none" },
          ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.55" },
          ".cm-focused": { outline: "none" }
        })
      ]
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === view.state.doc.toString()) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={hostRef} className="notebook-code-editor" />;
}
