import { X } from "lucide-react";
import { useOS } from "../store/os";
import { liveFiles, useFs } from "../store/fs";
import { appMeta } from "../appMeta";
import { useClock } from "../lib/useClock";

export default function TaskManager() {
  const windows = useOS((s) => s.windows);
  const bootedAt = useOS((s) => s.bootedAt);
  const close = useOS((s) => s.closeWindow);
  const focus = useOS((s) => s.focusWindow);
  const files = useFs((s) => liveFiles(s.nodes).length);
  const now = useClock(1000);

  const secs = Math.max(0, Math.floor((now.getTime() - bootedAt) / 1000));
  const uptime = `${String(Math.floor(secs / 3600)).padStart(2, "0")}:${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="tm">
      <div className="tm-cards">
        <div><b>{windows.length}</b><span>Jendela</span></div>
        <div><b>{uptime}</b><span>Waktu aktif</span></div>
        <div><b>{files}</b><span>File</span></div>
      </div>
      <div className="tm-list">
        {windows.length === 0 && <p className="muted">Tidak ada jendela yang terbuka.</p>}
        {windows.map((w) => {
          const m = appMeta[w.appId];
          return (
            <div key={w.id} className="tm-row">
              <m.icon size={18} style={{ color: m.color }} />
              <button className="tm-name" onClick={() => focus(w.id)}>{w.title}</button>
              <small>D{w.desk + 1} · {w.minimized ? "Diminimalkan" : "Berjalan"}</small>
              <button className="btn ghost" onClick={() => close(w.id)}>
                <X size={14} /> Akhiri tugas
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
