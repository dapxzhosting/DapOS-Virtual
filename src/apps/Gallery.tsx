import { useRef, useState } from "react";
import { Download, ImagePlus, Monitor, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useOS } from "../store/os";
import { liveFiles, useFs } from "../store/fs";
import { isImage } from "../lib/openFile";
import type { AppProps } from "../types";

export default function Gallery({ win }: AppProps) {
  const nodes = useFs((s) => s.nodes);
  const touch = useFs((s) => s.touch);
  const trash = useFs((s) => s.trash);
  const setWallpaper = useOS((s) => s.setWallpaper);
  const notify = useOS((s) => s.notify);
  const [sel, setSel] = useState<string | undefined>(win.payload?.fileId);
  const [zoom, setZoom] = useState(1);
  const input = useRef<HTMLInputElement>(null);

  const images = liveFiles(nodes).filter(isImage).sort((a, b) => b.modified - a.modified);
  const current = images.find((i) => i.id === sel) ?? images[0];

  const importFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("image/")) return notify("Galeri", `${f.name} bukan gambar.`);
      if (f.size > 2 * 1024 * 1024) return notify("Galeri", `${f.name} lebih dari 2 MB, terlalu besar untuk penyimpanan browser.`);
      const r = new FileReader();
      r.onload = () => {
        const id = touch("pictures", f.name, String(r.result));
        setSel(id);
      };
      r.readAsDataURL(f);
    });
  };

  return (
    <div className="gal">
      <div className="gal-bar">
        <button className="btn ghost" onClick={() => input.current?.click()}>
          <ImagePlus size={15} /> Impor gambar
        </button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { importFiles(e.target.files); e.target.value = ""; }} />
        <span className="grow" />
        {current && (
          <>
            <button className="icon-btn" aria-label="Perkecil" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>
              <ZoomOut size={16} />
            </button>
            <span className="gal-zoom">{Math.round(zoom * 100)}%</span>
            <button className="icon-btn" aria-label="Perbesar" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
              <ZoomIn size={16} />
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setWallpaper(`url("${current.content}") center / cover no-repeat`);
                notify("Wallpaper diganti", current.name);
              }}
            >
              <Monitor size={15} /> Jadikan wallpaper
            </button>
            <a className="icon-btn" aria-label="Unduh" href={current.content} download={current.name}>
              <Download size={16} />
            </a>
            <button
              className="icon-btn"
              aria-label="Hapus"
              onClick={() => {
                trash(current.id);
                setSel(undefined);
              }}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
      <div className="gal-wrap">
        <div className="gal-thumbs">
          {images.map((i) => (
            <button key={i.id} className={i.id === current?.id ? "on" : ""} onClick={() => { setSel(i.id); setZoom(1); }}>
              <img src={i.content} alt={i.name} />
            </button>
          ))}
        </div>
        <div className="gal-view">
          {current ? (
            <img src={current.content} alt={current.name} style={{ transform: `scale(${zoom})` }} />
          ) : (
            <p className="muted">
              Belum ada gambar. Impor dari komputer, simpan hasil Lukis, atau ambil foto lewat Kamera.
            </p>
          )}
        </div>
      </div>
      <div className="ex-status">{current ? `${current.name} · ${images.length} gambar` : "0 gambar"}</div>
    </div>
  );
}
