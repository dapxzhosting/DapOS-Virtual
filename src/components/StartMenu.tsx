import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Lock, Power, RotateCcw, Search } from "lucide-react";
import { useOS } from "../store/os";
import { useFs, liveFiles, pathOf } from "../store/fs";
import { appIds, appMeta } from "../appMeta";
import { openNode } from "../lib/openFile";

export default function StartMenu() {
  const openApp = useOS((s) => s.openApp);
  const setPhase = useOS((s) => s.setPhase);
  const userName = useOS((s) => s.userName);
  const installed = useOS((s) => s.installed);
  const nodes = useFs((s) => s.nodes);
  const [q, setQ] = useState("");
  const [power, setPower] = useState(false);

  const query = q.trim().toLowerCase();
  const apps = appIds.filter((id) => installed.includes(id) && appMeta[id].title.toLowerCase().includes(query));
  const allFiles = liveFiles(nodes);
  const found = query ? allFiles.filter((n) => n.name.toLowerCase().includes(query)).slice(0, 6) : [];
  const recent = [...allFiles].sort((a, b) => b.modified - a.modified).slice(0, 4);

  const onEnter = () => {
    const first = apps[0];
    const file = found[0];
    if (first) openApp(first);
    else if (file) openNode(file);
  };

  return (
    <motion.div
      className="start"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setPower(false);
      }}
    >
      <label className="start-search">
        <Search size={16} />
        <input
          autoFocus
          value={q}
          placeholder="Cari aplikasi dan file"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter()}
        />
      </label>

      <div className="start-scroll">
        <h4>{query ? "Aplikasi" : "Disematkan"}</h4>
        {apps.length === 0 && <p className="muted">Tidak ada aplikasi bernama “{q}”.</p>}
        <div className="start-grid">
          {apps.map((id) => {
            const m = appMeta[id];
            return (
              <button key={id} className="start-app" onClick={() => openApp(id)}>
                <span className="tile" style={{ background: m.color }}>
                  <m.icon size={22} color="#fff" />
                </span>
                {m.title}
              </button>
            );
          })}
        </div>

        {query ? (
          found.length > 0 && (
            <>
              <h4>File</h4>
              {found.map((n) => (
                <button key={n.id} className="start-rec" onClick={() => openNode(n)}>
                  <FileText size={18} />
                  <span>
                    {n.name}
                    <small>{pathOf(nodes, n.parent ?? "root")}</small>
                  </span>
                </button>
              ))}
            </>
          )
        ) : (
          <>
            <h4>Terakhir dibuka</h4>
            {recent.length === 0 && <p className="muted">Belum ada file. Buat satu lewat Catatan.</p>}
            <div className="start-recs">
              {recent.map((n) => (
                <button key={n.id} className="start-rec" onClick={() => openNode(n)}>
                  <FileText size={18} />
                  <span>
                    {n.name}
                    <small>{pathOf(nodes, n.parent ?? "root")}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="start-foot">
        <div className="who">
          <span className="avatar sm">{userName.slice(0, 1).toUpperCase()}</span>
          {userName}
        </div>
        <div className="power-wrap">
          {power && (
            <div className="power-pop" onMouseDown={(e) => e.stopPropagation()}>
              <button onClick={() => setPhase("lock")}>
                <Lock size={15} /> Kunci
              </button>
              <button onClick={() => setPhase("boot")}>
                <RotateCcw size={15} /> Mulai ulang
              </button>
              <button onClick={() => setPhase("off")}>
                <Power size={15} /> Matikan
              </button>
            </div>
          )}
          <button
            className="icon-btn"
            aria-label="Daya"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setPower((v) => !v)}
          >
            <Power size={17} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
