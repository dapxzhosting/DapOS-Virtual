import { useEffect, useRef, useState } from "react";
import { FolderOpen, Link as LinkIcon } from "lucide-react";

interface Item { id: number; name: string; src: string; local: boolean }

export default function Video() {
  const [items, setItems] = useState<Item[]>([]);
  const [cur, setCur] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const idc = useRef(1);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    const list = urls.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const add = (name: string, src: string, local: boolean) => {
    const id = idc.current++;
    setItems((s) => [...s, { id, name, src, local }]);
    setCur(id);
  };
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      const u = URL.createObjectURL(f);
      urls.current.push(u);
      add(f.name, u, true);
    });
  };
  const addUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return;
    add(u.split("/").pop() || u, u, false);
    setUrl("");
  };

  const current = items.find((i) => i.id === cur);

  return (
    <div className="vid">
      <div className="vid-main">
        {current ? (
          <video key={current.id} src={current.src} controls autoPlay />
        ) : (
          <div className="vid-empty">
            <p className="muted">Pilih video dari komputer atau tempel alamat URL video (mp4, webm).</p>
          </div>
        )}
      </div>
      <div className="vid-side">
        <button className="btn" onClick={() => file.current?.click()}>
          <FolderOpen size={15} /> Buka video
        </button>
        <input ref={file} type="file" accept="video/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        <div className="vid-url">
          <input className="input" placeholder="https://…/video.mp4" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addUrl()} />
          <button className="icon-btn" aria-label="Tambah URL" onClick={addUrl}>
            <LinkIcon size={15} />
          </button>
        </div>
        <div className="vid-list">
          {items.length === 0 && <p className="muted">Daftar putar kosong.</p>}
          {items.map((i) => (
            <button key={i.id} className={i.id === cur ? "on" : ""} onClick={() => setCur(i.id)}>
              {i.name}
            </button>
          ))}
        </div>
        <small className="muted">Video dari komputer hanya diputar selama jendela terbuka dan tidak disimpan.</small>
      </div>
    </div>
  );
}
