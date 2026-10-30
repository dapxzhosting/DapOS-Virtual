import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { MAX_DESKS, useOS } from "../store/os";
import { appMeta } from "../appMeta";

export default function TaskView() {
  const windows = useOS((s) => s.windows);
  const desks = useOS((s) => s.desks);
  const cur = useOS((s) => s.currentDesk);
  const goDesk = useOS((s) => s.goDesk);
  const addDesk = useOS((s) => s.addDesk);
  const removeDesk = useOS((s) => s.removeDesk);
  const focus = useOS((s) => s.focusWindow);
  const close = useOS((s) => s.closeWindow);
  const moveTo = useOS((s) => s.moveWindowToDesk);
  const toggle = useOS((s) => s.toggleTaskView);

  const here = windows.filter((w) => w.desk === cur);

  return (
    <motion.div
      className="taskview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(e) => {
        e.stopPropagation();
        toggle();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="tv-desks" onMouseDown={(e) => e.stopPropagation()}>
        {Array.from({ length: desks }, (_, i) => (
          <div key={i} className={"tv-desk" + (i === cur ? " on" : "")}>
            <button className="tv-desk-main" onClick={() => goDesk(i)}>
              <b>Desktop {i + 1}</b>
              <small>{windows.filter((w) => w.desk === i).length} jendela</small>
            </button>
            {desks > 1 && (
              <button className="tv-x" aria-label={`Hapus Desktop ${i + 1}`} onClick={() => removeDesk(i)}>
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {desks < MAX_DESKS && (
          <button className="tv-desk add" onClick={addDesk}>
            <Plus size={18} /> Desktop baru
          </button>
        )}
      </div>

      <div className="tv-wins" onMouseDown={(e) => e.stopPropagation()}>
        {here.length === 0 && <p className="tv-empty">Tidak ada jendela di Desktop {cur + 1}.</p>}
        {here.map((w) => {
          const m = appMeta[w.appId];
          return (
            <div key={w.id} className="tv-card" onClick={() => focus(w.id)}>
              <div className="tv-card-top">
                <m.icon size={16} style={{ color: m.color }} />
                <span>{w.title}</span>
                <button
                  className="tv-x"
                  aria-label="Tutup jendela"
                  onClick={(e) => {
                    e.stopPropagation();
                    close(w.id);
                  }}
                >
                  <X size={13} />
                </button>
              </div>
              <div className="tv-card-body" style={{ color: m.color }}>
                <m.icon size={44} />
              </div>
              {desks > 1 && (
                <div className="tv-move" onClick={(e) => e.stopPropagation()}>
                  <small>Pindah ke</small>
                  {Array.from({ length: desks }, (_, i) =>
                    i === cur ? null : (
                      <button key={i} onClick={() => moveTo(w.id, i)}>
                        {i + 1}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="tv-hint">Alt+1…4 pindah desktop · Esc untuk menutup</div>
    </motion.div>
  );
}
