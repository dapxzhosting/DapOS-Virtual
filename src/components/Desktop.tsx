import { useEffect, useRef, useState } from "react";
import type { DragEvent as RDragEvent } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ClipboardPaste, Copy, FilePlus, FileText, Folder, FolderOpen, FolderPlus, Image as ImageIcon,
  LayoutDashboard, LayoutGrid, Palette, RefreshCw, Scissors, Settings as SettingsIcon, StickyNote, Trash,
  Trash2,
} from "lucide-react";
import { TASKBAR_H, useOS, activeWindowId } from "../store/os";
import { TRASH, childrenOf, useFs } from "../store/fs";
import { appMeta, desktopApps } from "../appMeta";
import { wallpapers } from "../lib/wallpapers";
import { isImage, openNode } from "../lib/openFile";
import { getDragOffset, hasDrag, readDrag, setDragOffset, startDrag } from "../lib/dnd";
import type { DragPayload } from "../lib/dnd";
import { playTone } from "../lib/sound";
import Window from "./Window";
import Taskbar from "./Taskbar";
import StartMenu from "./StartMenu";
import QuickPanel from "./QuickPanel";
import WidgetsPanel from "./WidgetsPanel";
import TaskView from "./TaskView";
import Switcher from "./Switcher";
import NotesLayer from "./NotesLayer";
import Toasts from "./Toasts";
import ContextMenu from "./ContextMenu";
import type { MenuItem } from "./ContextMenu";

interface DItem { key: string; kind: DragPayload["kind"]; id: string; label: string }

const PAD = 8;
const cellOf = (p: { x: number; y: number }, cell: number) => ({
  c: Math.max(0, Math.round((p.x - PAD) / cell)),
  r: Math.max(0, Math.round((p.y - PAD) / cell)),
});

function layoutIcons(keys: string[], saved: Record<string, { x: number; y: number }>, cell: number, rows: number) {
  const occ = new Set<string>();
  const out: Record<string, { x: number; y: number }> = {};
  for (const k of keys) {
    const p = saved[k];
    if (!p) continue;
    const { c, r } = cellOf(p, cell);
    occ.add(`${c},${r}`);
    out[k] = { x: PAD + c * cell, y: PAD + r * cell };
  }
  let c = 0;
  let r = 0;
  for (const k of keys) {
    if (out[k]) continue;
    while (occ.has(`${c},${r}`)) {
      r++;
      if (r >= rows) {
        r = 0;
        c++;
      }
    }
    occ.add(`${c},${r}`);
    out[k] = { x: PAD + c * cell, y: PAD + r * cell };
  }
  return out;
}

const keyOf = (p: DragPayload) => (p.kind === "app" ? `app:${p.id}` : p.kind === "trash" ? "trash" : `node:${p.id}`);

export default function Desktop() {
  const windows = useOS((s) => s.windows);
  const phase = useOS((s) => s.phase);
  const desk = useOS((s) => s.currentDesk);
  const wallpaper = useOS((s) => s.wallpaper);
  const startOpen = useOS((s) => s.startOpen);
  const panelOpen = useOS((s) => s.panelOpen);
  const widgetsOpen = useOS((s) => s.widgetsOpen);
  const taskView = useOS((s) => s.taskView);
  const snapHint = useOS((s) => s.snapHint);
  const brightness = useOS((s) => s.brightness);
  const installed = useOS((s) => s.installed);
  const iconPos = useOS((s) => s.iconPos);
  const iconSize = useOS((s) => s.iconSize);
  const openApp = useOS((s) => s.openApp);
  const closeMenus = useOS((s) => s.closeMenus);
  const setWallpaper = useOS((s) => s.setWallpaper);
  const setIconPos = useOS((s) => s.setIconPos);
  const nodes = useFs((s) => s.nodes);
  const clipboard = useFs((s) => s.clipboard);

  const layerRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState({ w: window.innerWidth, h: window.innerHeight - TASKBAR_H });
  const [sel, setSel] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; item: DItem | null } | null>(null);
  const [sw, setSw] = useState<number | null>(null);
  const swRef = useRef<number | null>(null);
  const selRef = useRef<string | null>(null);
  selRef.current = sel;

  useEffect(() => {
    const on = () => setLayer({ w: window.innerWidth, h: window.innerHeight - TASKBAR_H });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const quota = () => useOS.getState().notify("Penyimpanan penuh", "Browser tidak bisa menyimpan lagi. Hapus gambar atau file besar.");
    window.addEventListener("dapos-quota", quota);
    return () => window.removeEventListener("dapos-quota", quota);
  }, []);

  useEffect(() => {
    const fired: Record<string, string> = {};
    const t = setInterval(() => {
      const os = useOS.getState();
      const d = new Date();
      const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const stamp = `${d.toDateString()} ${hhmm}`;
      for (const a of os.alarms) {
        if (a.on && a.time === hhmm && fired[a.id] !== stamp) {
          fired[a.id] = stamp;
          os.notify("Alarm", a.label || `Pukul ${a.time}`);
          if (os.sounds) playTone("alarm");
        }
      }
      if (os.timer.end && Date.now() >= os.timer.end) {
        os.cancelTimer();
        os.notify("Timer selesai", "Waktu yang kamu atur sudah habis.");
        if (os.sounds) playTone("alarm");
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const cell = iconSize === "sm" ? 76 : iconSize === "lg" ? 112 : 92;
  const rows = Math.max(1, Math.floor((layer.h - PAD) / cell));
  const maxCol = Math.max(0, Math.floor((layer.w - PAD) / cell) - 1);

  const items: DItem[] = [
    ...desktopApps
      .filter((id) => installed.includes(id))
      .map((id) => ({ key: `app:${id}`, kind: "app" as const, id, label: appMeta[id].title })),
    { key: "trash", kind: "trash" as const, id: TRASH, label: "Tempat Sampah" },
    ...childrenOf(nodes, "desktop").map((n) => ({ key: `node:${n.id}`, kind: "node" as const, id: n.id, label: n.name })),
  ];
  const positions = layoutIcons(items.map((i) => i.key), iconPos, cell, rows);

  const activeId = activeWindowId(windows, desk);
  const deskWins = windows.filter((w) => w.desk === desk).sort((a, b) => b.z - a.z);
  const deskWinsRef = useRef(deskWins);
  deskWinsRef.current = deskWins;

  const cycleWallpaper = () => {
    const i = wallpapers.findIndex((w) => w.css === wallpaper);
    setWallpaper(wallpapers[(i + 1) % wallpapers.length]?.css ?? wallpapers[0]!.css);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "desktop") return;
      const os = useOS.getState();
      const t = e.target as HTMLElement | null;
      const typing = !!t?.closest("input, textarea, [contenteditable='true'], .monaco-editor");
      const inWin = !!t?.closest(".win");
      if (e.key === "Escape") {
        os.closeMenus();
        if (os.taskView) os.toggleTaskView();
        return;
      }
      if (e.altKey) {
        const wins = deskWinsRef.current;
        const active = activeWindowId(os.windows, os.currentDesk);
        let handled = true;
        switch (e.code) {
          case "KeyT": os.openApp("terminal"); break;
          case "KeyE": os.openApp("explorer"); break;
          case "KeyD": os.showDesktop(); break;
          case "KeyS": os.toggleStart(); break;
          case "KeyL": os.setPhase("lock"); break;
          case "KeyV": os.toggleTaskView(); break;
          case "KeyW": if (active) os.closeWindow(active); break;
          case "Digit1": case "Digit2": case "Digit3": case "Digit4":
            os.goDesk(Number(e.code.slice(5)) - 1); break;
          case "ArrowLeft": if (active) os.snapWindow(active, "left"); break;
          case "ArrowRight": if (active) os.snapWindow(active, "right"); break;
          case "ArrowUp": if (active) os.snapWindow(active, "max"); break;
          case "ArrowDown": if (active) os.snapWindow(active, "restore"); break;
          case "KeyQ": {
            if (wins.length === 0) break;
            const cur = swRef.current;
            const dir = e.shiftKey ? -1 : 1;
            const next = cur === null ? (wins.length > 1 ? 1 : 0) : (cur + dir + wins.length) % wins.length;
            swRef.current = next;
            setSw(next);
            break;
          }
          default: handled = false;
        }
        if (handled) e.preventDefault();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      const cur = selRef.current;
      if (typing || inWin) return;
      const fs = useFs.getState();
      if (mod && e.key.toLowerCase() === "v") {
        if (fs.paste("desktop") > 0) e.preventDefault();
      } else if (cur?.startsWith("node:")) {
        const id = cur.slice(5);
        if (mod && e.key.toLowerCase() === "c") fs.setClipboard([id], "copy");
        else if (mod && e.key.toLowerCase() === "x") fs.setClipboard([id], "cut");
        else if (e.key === "Delete") {
          fs.trash(id);
          setSel(null);
        }
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key !== "Alt" || swRef.current === null) return;
      const target = deskWinsRef.current[swRef.current];
      swRef.current = null;
      setSw(null);
      if (target) useOS.getState().focusWindow(target.id);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [phase]);

  const openItem = (it: DItem) => {
    if (it.kind === "app") openApp(it.id as never);
    else if (it.kind === "trash") openApp("explorer", { folderId: TRASH });
    else {
      const n = nodes[it.id];
      if (n) openNode(n);
    }
  };

  const nearestFree = (c0: number, r0: number, occ: Set<string>) => {
    for (let d = 0; d < 40; d++) {
      for (let dc = -d; dc <= d; dc++) {
        for (let dr = -d; dr <= d; dr++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
          const c = c0 + dc;
          const r = r0 + dr;
          if (c < 0 || r < 0 || c > maxCol || r >= rows) continue;
          if (!occ.has(`${c},${r}`)) return { c, r };
        }
      }
    }
    return { c: c0, r: r0 };
  };

  const onRootDrop = (e: RDragEvent) => {
    const p = readDrag(e);
    if (!p) return;
    e.preventDefault();
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const off = getDragOffset();
    const x = e.clientX - rect.left - off.x;
    const y = e.clientY - rect.top - off.y;
    const k = keyOf(p);
    const occ = new Set<string>();
    for (const [key, pos] of Object.entries(positions)) {
      if (key === k) continue;
      const { c, r } = cellOf(pos, cell);
      occ.add(`${c},${r}`);
    }
    const want = cellOf({ x, y }, cell);
    const free = nearestFree(Math.min(want.c, maxCol), Math.min(want.r, rows - 1), occ);
    if (p.kind === "node") {
      const n = nodes[p.id];
      if (n && n.parent !== "desktop") useFs.getState().move(p.id, "desktop");
    }
    setIconPos(k, { x: PAD + free.c * cell, y: PAD + free.r * cell });
  };

  const onIconDrop = (e: RDragEvent, it: DItem) => {
    const p = readDrag(e);
    setOver(null);
    if (!p || p.kind !== "node") return;
    const fs = useFs.getState();
    if (it.kind === "trash") {
      e.preventDefault();
      e.stopPropagation();
      fs.trash(p.id);
    } else if (it.kind === "node" && nodes[it.id]?.type === "folder" && p.id !== it.id) {
      e.preventDefault();
      e.stopPropagation();
      fs.move(p.id, it.id);
    }
  };

  const buildMenu = (it: DItem | null): MenuItem[] => {
    const fs = useFs.getState();
    if (it?.kind === "trash") {
      return [
        { label: "Buka", icon: FolderOpen, onClick: () => openItem(it) },
        { label: "Kosongkan Tempat Sampah", icon: Trash2, danger: true, onClick: () => fs.emptyTrash() },
      ];
    }
    if (it?.kind === "app") return [{ label: "Buka", icon: FolderOpen, onClick: () => openItem(it) }];
    if (it?.kind === "node") {
      return [
        { label: "Buka", icon: FolderOpen, onClick: () => openItem(it) },
        { label: "Salin", icon: Copy, onClick: () => fs.setClipboard([it.id], "copy") },
        { label: "Potong", icon: Scissors, onClick: () => fs.setClipboard([it.id], "cut") },
        { sep: true },
        { label: "Hapus", icon: Trash2, danger: true, onClick: () => fs.trash(it.id) },
      ];
    }
    const list: MenuItem[] = [
      { label: "Folder baru", icon: FolderPlus, onClick: () => fs.mkdir("desktop", "Folder baru") },
      { label: "File teks baru", icon: FilePlus, onClick: () => fs.touch("desktop", "Dokumen baru.txt") },
    ];
    if (clipboard) list.push({ label: "Tempel", icon: ClipboardPaste, onClick: () => fs.paste("desktop") });
    list.push(
      { sep: true },
      { label: "Catatan tempel baru", icon: StickyNote, onClick: () => openApp("sticky") },
      { label: "Susun ikon otomatis", icon: LayoutGrid, onClick: () => useOS.getState().resetIconPos() },
      { label: "Ganti wallpaper", icon: Palette, onClick: cycleWallpaper },
      { label: "Tampilkan desktop", icon: LayoutDashboard, onClick: () => useOS.getState().showDesktop() },
      { label: "Segarkan", icon: RefreshCw, onClick: () => setSel(null) },
      { sep: true },
      { label: "Pengaturan", icon: SettingsIcon, onClick: () => openApp("settings") }
    );
    return list;
  };

  const style = { "--cell": `${cell}px`, "--tile": `${iconSize === "sm" ? 36 : iconSize === "lg" ? 56 : 44}px` } as React.CSSProperties;

  const hintRect =
    snapHint === "left"
      ? { left: 0, top: 0, width: "50%", height: "100%" }
      : snapHint === "right"
      ? { left: "50%", top: 0, width: "50%", height: "100%" }
      : snapHint === "top"
      ? { left: 0, top: 0, width: "100%", height: "100%" }
      : null;

  return (
    <div
      className="desktop"
      style={style}
      onMouseDown={() => {
        closeMenus();
        setSel(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setSel(null);
        setMenu({ x: e.clientX, y: e.clientY, item: null });
      }}
      onDragOver={(e) => hasDrag(e) && e.preventDefault()}
      onDrop={onRootDrop}
    >
      <div className="wallpaper" style={{ background: wallpaper }} />

      <div className="dlayer" ref={layerRef}>
        {items.map((it) => {
          const pos = positions[it.key] ?? { x: PAD, y: PAD };
          const n = it.kind === "node" ? nodes[it.id] : undefined;
          const meta = it.kind === "app" ? appMeta[it.id as keyof typeof appMeta] : null;
          return (
            <button
              key={it.key}
              draggable
              className={"dicon" + (sel === it.key ? " sel" : "") + (over === it.key ? " over" : "")}
              style={{ left: pos.x, top: pos.y }}
              onDragStart={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setDragOffset(e.clientX - r.left, e.clientY - r.top);
                startDrag(e, { kind: it.kind, id: it.id });
              }}
              onDragOver={(e) => {
                if (hasDrag(e) && (it.kind === "trash" || n?.type === "folder")) {
                  e.preventDefault();
                  e.stopPropagation();
                  setOver(it.key);
                }
              }}
              onDragLeave={() => setOver((o) => (o === it.key ? null : o))}
              onDrop={(e) => onIconDrop(e, it)}
              onMouseDown={(e) => {
                e.stopPropagation();
                closeMenus();
                setSel(it.key);
              }}
              onDoubleClick={() => openItem(it)}
              onKeyDown={(e) => e.key === "Enter" && openItem(it)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSel(it.key);
                setMenu({ x: e.clientX, y: e.clientY, item: it });
              }}
            >
              {meta ? (
                <span className="dicon-tile" style={{ background: meta.color }}>
                  <meta.icon size={26} color="#fff" />
                </span>
              ) : (
                <span className="dicon-tile plain">
                  {it.kind === "trash" ? (
                    <Trash size={32} color="#cbd5e1" />
                  ) : n?.type === "folder" ? (
                    <Folder size={34} color="#f2b441" fill="#f2b441" fillOpacity={0.25} />
                  ) : n && isImage(n) ? (
                    <ImageIcon size={30} color="#e879f9" />
                  ) : (
                    <FileText size={30} color="#4da3ff" />
                  )}
                </span>
              )}
              <span className="dicon-label">{it.label}</span>
            </button>
          );
        })}
        <NotesLayer />
      </div>

      <div className="win-layer">
        {windows.map((w) => (
          <Window key={w.id} win={w} active={w.id === activeId} hidden={w.minimized || w.desk !== desk} />
        ))}
        {hintRect && <div className="snap-hint" style={hintRect} />}
      </div>

      <AnimatePresence>
        {startOpen && <StartMenu key="start" />}
        {panelOpen && <QuickPanel key="panel" />}
        {widgetsOpen && <WidgetsPanel key="widgets" />}
        {taskView && <TaskView key="taskview" />}
      </AnimatePresence>

      {sw !== null && <Switcher wins={deskWins} index={sw} />}
      <Taskbar />
      <Toasts />
      {menu && <ContextMenu x={menu.x} y={menu.y} items={buildMenu(menu.item)} onClose={() => setMenu(null)} />}
      <div className="dim" style={{ opacity: ((100 - brightness) / 100) * 0.75 }} />
    </div>
  );
}
