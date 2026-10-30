import { useState } from "react";
import { Check, Download, Search, Trash2 } from "lucide-react";
import { useOS } from "../store/os";
import { appIds, appMeta } from "../appMeta";

export default function AppStore() {
  const installed = useOS((s) => s.installed);
  const install = useOS((s) => s.install);
  const uninstall = useOS((s) => s.uninstall);
  const notify = useOS((s) => s.notify);
  const [q, setQ] = useState("");

  const list = appIds.filter((id) => {
    const m = appMeta[id];
    return (m.title + " " + m.desc).toLowerCase().includes(q.trim().toLowerCase());
  });

  return (
    <div className="store">
      <div className="store-head">
        <div>
          <h2>Toko Aplikasi</h2>
          <p className="muted">
            {installed.length} dari {appIds.length} aplikasi terpasang
          </p>
        </div>
        <label className="ex-search wide">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aplikasi" />
        </label>
      </div>
      <div className="store-grid">
        {list.map((id) => {
          const m = appMeta[id];
          const on = installed.includes(id);
          return (
            <div key={id} className="store-card">
              <span className="tile big" style={{ background: m.color }}>
                <m.icon size={26} color="#fff" />
              </span>
              <div className="store-info">
                <b>{m.title}</b>
                <span>{m.desc}</span>
              </div>
              {m.core ? (
                <span className="store-core">
                  <Check size={14} /> Bawaan
                </span>
              ) : on ? (
                <button
                  className="btn ghost"
                  onClick={() => {
                    uninstall(id);
                    notify("Aplikasi dicopot", m.title);
                  }}
                >
                  <Trash2 size={14} /> Copot
                </button>
              ) : (
                <button
                  className="btn"
                  onClick={() => {
                    install(id);
                    notify("Aplikasi dipasang", `${m.title} siap dipakai dari menu Mulai.`);
                  }}
                >
                  <Download size={14} /> Pasang
                </button>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="muted">Tidak ada aplikasi yang cocok.</p>}
      </div>
    </div>
  );
}
