import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
import { Copy, Minus, Square, X } from "lucide-react";
import { TASKBAR_H, useOS } from "../store/os";
import { appMeta } from "../appMeta";
import { appComponents } from "../registry";
import type { WindowState } from "../types";

export default function Window({ win, active, hidden }: { win: WindowState; active: boolean; hidden: boolean }) {
  const focus = useOS((s) => s.focusWindow);
  const close = useOS((s) => s.closeWindow);
  const minimize = useOS((s) => s.toggleMinimize);
  const maximize = useOS((s) => s.toggleMaximize);
  const moveResize = useOS((s) => s.moveResize);
  const snapWindow = useOS((s) => s.snapWindow);
  const setHint = useOS((s) => s.setSnapHint);
  const meta = appMeta[win.appId];
  const AppView = appComponents[win.appId];
  const Icon = meta.icon;

  return (
    <Rnd
      className={"win" + (hidden ? " min" : "")}
      size={win.maximized ? { width: "100%", height: "100%" } : { width: win.w, height: win.h }}
      position={win.maximized ? { x: 0, y: 0 } : { x: win.x, y: win.y }}
      disableDragging={win.maximized}
      enableResizing={!win.maximized}
      minWidth={Math.min(win.appId === "calculator" ? 300 : 340, window.innerWidth - 16)}
      minHeight={200}
      bounds="parent"
      dragHandleClassName="win-bar"
      cancel=".win-ctl"
      style={{ zIndex: win.z }}
      onMouseDown={() => focus(win.id)}
      onDrag={(e) => {
        const ev = e as unknown as {
          clientX?: number;
          clientY?: number;
          touches?: ArrayLike<{ clientX: number; clientY: number }>;
        };
        const pt = ev.touches?.[0] ?? { clientX: ev.clientX ?? 0, clientY: ev.clientY ?? 0 };
        const top = useOS.getState().tbPos === "top" ? TASKBAR_H : 0;
        setHint(
          pt.clientX <= 6 ? "left" : pt.clientX >= window.innerWidth - 6 ? "right" : pt.clientY <= top + 6 ? "top" : null
        );
      }}
      onDragStop={(_, d) => {
        const hint = useOS.getState().snapHint;
        setHint(null);
        if (hint) snapWindow(win.id, hint === "top" ? "max" : hint);
        else moveResize(win.id, { x: d.x, y: d.y, snap: null });
      }}
      onResizeStop={(_, __, ref, ___, pos) =>
        moveResize(win.id, { w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y, snap: null })
      }
    >
      <motion.div
        className={"win-frame" + (active ? " active" : "") + (win.maximized ? " max" : "")}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        onContextMenu={(e) => e.stopPropagation()}
      >
        <div className="win-bar" onDoubleClick={() => maximize(win.id)}>
          <span className="win-ico" style={{ color: meta.color }}>
            <Icon size={15} />
          </span>
          <span className="win-title">{win.title}</span>
          <button className="win-ctl" aria-label="Minimalkan" onClick={() => minimize(win.id)}>
            <Minus size={15} />
          </button>
          <button
            className="win-ctl"
            aria-label={win.maximized ? "Kembalikan" : "Maksimalkan"}
            onClick={() => maximize(win.id)}
          >
            {win.maximized ? <Copy size={13} /> : <Square size={12} />}
          </button>
          <button className="win-ctl close" aria-label="Tutup" onClick={() => close(win.id)}>
            <X size={16} />
          </button>
        </div>
        <div className="win-body">
          <AppView win={win} />
        </div>
      </motion.div>
    </Rnd>
  );
}
