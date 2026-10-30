import { useEffect, useState } from "react";
import { FilePlus, Save } from "lucide-react";
import { useOS } from "../store/os";
import { useFs } from "../store/fs";
import type { AppProps } from "../types";

export default function Notepad({ win }: AppProps) {
  const nodes = useFs((s) => s.nodes);
  const write = useFs((s) => s.write);
  const touch = useFs((s) => s.touch);
  const setTitle = useOS((s) => s.setTitle);
  const notify = useOS((s) => s.notify);

  const [fileId, setFileId] = useState<string | undefined>(win.payload?.fileId);
  const file = fileId ? nodes[fileId] : undefined;
  const [text, setText] = useState(file?.content ?? "");
  const [saved, setSaved] = useState(file?.content ?? "");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("catatan.txt");
  const dirty = text !== saved;

  useEffect(() => {
    setTitle(win.id, `${file?.name ?? "Tanpa judul"}${dirty ? " •" : ""} – Catatan`);
  }, [win.id, file?.name, dirty, setTitle]);

  const save = () => {
    if (file) {
      write(file.id, text);
      setSaved(text);
    } else {
      setNaming(true);
    }
  };
  const confirmName = () => {
    const nm = name.trim();
    if (!nm) return;
    const id = touch("documents", /\.[a-z0-9]+$/i.test(nm) ? nm : nm + ".txt", text);
    setFileId(id);
    setSaved(text);
    setNaming(false);
    notify("Tersimpan", "File disimpan di folder Dokumen.");
  };
  const fresh = () => {
    if (dirty && !window.confirm("Perubahan belum disimpan. Buat dokumen baru?")) return;
    setFileId(undefined);
    setText("");
    setSaved("");
  };

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div
      className="np"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
      }}
    >
      <div className="np-bar">
        <button className="btn ghost" onClick={fresh}>
          <FilePlus size={15} /> Baru
        </button>
        <button className="btn ghost" onClick={save} disabled={!dirty && !!file}>
          <Save size={15} /> Simpan
        </button>
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
      <textarea
        className="np-text"
        value={text}
        spellCheck={false}
        placeholder="Mulai mengetik…"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="np-status">
        {words} kata · {text.length} karakter · {dirty ? "Belum disimpan" : "Tersimpan"}
      </div>
    </div>
  );
}
