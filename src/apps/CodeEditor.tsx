import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { FilePlus, Save } from "lucide-react";
import { useOS } from "../store/os";
import { useFs } from "../store/fs";
import type { AppProps } from "../types";

const langs: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", json: "json", css: "css",
  html: "html", md: "markdown", py: "python", kt: "kotlin", java: "java", dart: "dart", sh: "shell",
  yml: "yaml", yaml: "yaml", xml: "xml", sql: "sql",
};
const langFor = (name: string) => langs[name.split(".").pop()?.toLowerCase() ?? ""] ?? "plaintext";

export default function CodeEditor({ win }: AppProps) {
  const nodes = useFs((s) => s.nodes);
  const write = useFs((s) => s.write);
  const touch = useFs((s) => s.touch);
  const theme = useOS((s) => s.theme);
  const setTitle = useOS((s) => s.setTitle);
  const notify = useOS((s) => s.notify);

  const [fileId, setFileId] = useState<string | undefined>(win.payload?.fileId);
  const file = fileId ? nodes[fileId] : undefined;
  const [text, setText] = useState(file?.content ?? "");
  const [saved, setSaved] = useState(file?.content ?? "");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("kode.ts");
  const dirty = text !== saved;
  const saveRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    setTitle(win.id, `${file?.name ?? "Tanpa judul"}${dirty ? " •" : ""} – Editor Kode`);
  }, [win.id, file?.name, dirty, setTitle]);

  const save = () => {
    if (file) {
      write(file.id, text);
      setSaved(text);
    } else setNaming(true);
  };
  saveRef.current = save;

  const confirmName = () => {
    const nm = name.trim();
    if (!nm) return;
    const id = touch("documents", nm, text);
    setFileId(id);
    setSaved(text);
    setNaming(false);
    notify("Tersimpan", "File disimpan di folder Dokumen.");
  };
  const fresh = () => {
    if (dirty && !window.confirm("Perubahan belum disimpan. Buat file baru?")) return;
    setFileId(undefined);
    setText("");
    setSaved("");
  };

  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current());
  };

  const language = langFor(file?.name ?? name);

  return (
    <div className="np">
      <div className="np-bar">
        <button className="btn ghost" onClick={fresh}>
          <FilePlus size={15} /> Baru
        </button>
        <button className="btn ghost" onClick={save} disabled={!dirty && !!file}>
          <Save size={15} /> Simpan
        </button>
        <span className="muted lang">{language}</span>
        {naming && (
          <span className="np-name">
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmName();
                if (e.key === "Escape") setNaming(false);
              }}
            />
            <button className="btn" onClick={confirmName}>
              Simpan di Dokumen
            </button>
          </span>
        )}
      </div>
      <div className="editor-host">
        <Editor
          height="100%"
          language={language}
          theme={theme === "dark" ? "vs-dark" : "light"}
          value={text}
          onChange={(v) => setText(v ?? "")}
          onMount={onMount}
          loading={<span className="muted">Memuat editor… (butuh koneksi internet)</span>}
          options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true, scrollBeyondLastLine: false, fontFamily: "JetBrains Mono, Consolas, monospace" }}
        />
      </div>
      <div className="np-status">
        {text.split("\n").length} baris · {text.length} karakter · {dirty ? "Belum disimpan" : "Tersimpan"}
      </div>
    </div>
  );
}
