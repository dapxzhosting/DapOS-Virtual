import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, Circle, Square, BatteryFull, Trash, Wifi, X } from "lucide-react";
import { useOS, activeWindowId } from "../store/os";
import { appIds, appMeta } from "../appMeta";
import { appComponents } from "../registry";
import { useClock } from "../lib/useClock";
import QuickPanel from "./QuickPanel";
import Toasts from "./Toasts";
import { TRASH } from "../store/fs";

export default function MobileShell() {
  const windows = useOS((s) => s.windows);
  const desk = useOS((s) => s.currentDesk);
  const wallpaper = useOS((s) => s.wallpaper);
  const installed = useOS((s) => s.installed);
  const panelOpen = useOS((s) => s.panelOpen);
  const clock24 = useOS((s) => s.clock24);
  const openApp = useOS((s) => s.openApp);
  const closeWindow = useOS((s) => s.closeWindow);
  const focusWindow = useOS((s) => s.focusWindow);
  const showDesktop = useOS((s) => s.showDesktop);
  const togglePanel = useOS((s) => s.togglePanel);
  const brightness = useOS((s) => s.brightness);
  const now = useClock(15000);
  const [recents, setRecents] = useState(false);

  const topId = activeWindowId(windows, desk);
  const here = windows.filter((w) => w.desk === desk);
  const apps = appIds.filter((id) => installed.includes(id) && !appMeta[id].noWindow);

  return (
    <div className="mobile" onMouseDown={() => panelOpen && togglePanel()}>
      <div className="m-wall" style={{ background: wallpaper }} />
      <div className="m-status" onMouseDown={(e) => e.stopPropagation()} onClick={togglePanel}>
        <b>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: !clock24 }).replace(".", ":")}</b>
        <span>
          <Wifi size={14} /> <BatteryFull size={15} />
        </span>
      </div>

      {!topId && (
        <div className="m-home">
          <div className="m-clock">
            <b>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: !clock24 }).replace(".", ":")}</b>
            <span>{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</span>
          </div>
          <div className="m-grid">
            {apps.map((id) => {
              const m = appMeta[id];
              return (
                <button key={id} className="m-app-ico" onClick={() => openApp(id)}>
                  <span className="tile" style={{ background: m.color }}>
                    <m.icon size={26} color="#fff" />
                  </span>
                  <span>{m.title}</span>
                </button>
              );
            })}
            <button className="m-app-ico" onClick={() => openApp("explorer", { folderId: TRASH })}>
              <span className="tile" style={{ background: "#64748b" }}>
                <Trash size={26} color="#fff" />
              </span>
              <span>Sampah</span>
            </button>
          </div>
        </div>
      )}

      {here.map((w) => {
        const View = appComponents[w.appId];
        const m = appMeta[w.appId];
        return (
          <div key={w.id} className="m-win" style={{ display: w.id === topId ? "flex" : "none" }}>
            <div className="m-win-bar">
              <m.icon size={16} style={{ color: m.color }} />
              <span>{w.title}</span>
              <button aria-label="Tutup" onClick={() => closeWindow(w.id)}>
                <X size={18} />
              </button>
            </div>
            <div className="m-win-body">
              <View win={w} />
            </div>
          </div>
        );
      })}

      {recents && (
        <div className="m-recents" onMouseDown={(e) => e.stopPropagation()}>
          <h4>Aplikasi terbuka</h4>
          {here.length === 0 && <p className="muted">Tidak ada aplikasi yang terbuka.</p>}
          {here.map((w) => {
            const m = appMeta[w.appId];
            return (
              <div key={w.id} className="m-recent" onClick={() => { focusWindow(w.id); setRecents(false); }}>
                <m.icon size={18} style={{ color: m.color }} />
                <span>{w.title}</span>
                <button aria-label="Tutup" onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }}>
                  <X size={16} />
                </button>
              </div>
            );
          })}
          <button className="btn ghost" onClick={() => setRecents(false)}>Tutup</button>
        </div>
      )}

      <AnimatePresence>{panelOpen && <QuickPanel key="panel" />}</AnimatePresence>
      <Toasts />

      <div className="m-nav" onMouseDown={(e) => e.stopPropagation()}>
        <button aria-label="Kembali" onClick={() => topId && closeWindow(topId)}>
          <ChevronLeft size={22} />
        </button>
        <button aria-label="Beranda" onClick={() => { setRecents(false); showDesktop(); }}>
          <Circle size={18} />
        </button>
        <button aria-label="Aplikasi terbuka" onClick={() => setRecents((v) => !v)}>
          <Square size={16} />
        </button>
      </div>
      <div className="dim" style={{ opacity: ((100 - brightness) / 100) * 0.75 }} />
    </div>
  );
}
