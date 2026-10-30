import { useState } from "react";
import type { DragEvent as RDragEvent, MouseEvent as RMouseEvent } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUp, ChevronRight, ClipboardPaste, Copy, FilePlus, FileText, Folder,
  FolderOpen, FolderPlus, Home, Image as ImageIcon, LayoutGrid, List, Monitor, Music, Pencil, Scissors,
  Search, Trash, Trash2, Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOS } from "../store/os";
import { ROOT, TRASH, childrenOf, chainOf, isProtected, useFs } from "../store/fs";
import type { FsNode } from "../store/fs";
import { isImage, openNode } from "../lib/openFile";
import { hasDrag, readDrag, startDrag } from "../lib/dnd";
import ContextMenu from "../components/ContextMenu";
import type { MenuItem } from "../components/ContextMenu";
import type { AppProps } from "../types";

const side: { id: string; label: string; icon: LucideIcon }[] = [
  { id: ROOT, label: "Beranda", icon: Home },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "documents", label: "Dokumen", icon: FileText },
  { id: "pictures", label: "Gambar", icon: ImageIcon },
  { id: "music", label: "Musik", icon: Music },
  { id: TRASH, label: "Tempat Sampah", icon: Trash },
];

const sizeLabel = (n: FsNode) => {
  if (n.type === "folder") return "Folder";
  const len = n.content.length;
  return len > 2048 ? `${Math.round(len / 1024)} KB` : `${len} karakter`;
};

export default function Explorer({ win }: AppProps) {
  const nodes = useFs((s) => s.nodes);
  const clipboard = useFs((s) => s.clipboard);
  const mkdir = useFs((s) => s.mkdir);
  const touch = useFs((s) => s.touch);
  const rename = useFs((s) => s.rename);
  const trash = useFs((s) => s.trash);
  const restore = useFs((s) => s.restore);
  const deleteForever = useFs((s) => s.deleteForever);
  const emptyTrash = useFs((s) => s.emptyTrash);
  const move = useFs((s) => s.move);
  const setClipboard = useFs((s) => s.setClipboard);
  const paste = useFs((s) => s.paste);
  const notify = useOS((s) => s.notify);

  const [cur, setCur] = useState(win.payload?.folderId ?? ROOT);
  const [back, setBack] = useState<string[]>([]);
  const [fwd, setFwd] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; target: string | null } | null>(null);

  const curId = nodes[cur] ? cur : ROOT;
  const inTrash = curId === TRASH;
  const items = childrenOf(nodes, curId).filter((n) => n.name.toLowerCase().includes(q.toLowerCase()));
  const crumbs = chainOf(nodes, curId);
  const parent = nodes[curId]?.parent ?? null;
  const canUp = !!parent && curId !== TRASH;

  const go = (id: string) => {
    if (id === curId) return;
    setBack([...back, curId]);
    setFwd([]);
    setCur(id);
    setSel(null);
    setQ("");
  };
  const goBack = () => {
    const prev = back[back.length - 1];
    if (!prev) return;
    setBack(back.slice(0, -1));
    setFwd([curId, ...fwd]);
    setCur(prev);
    setSel(null);
  };
  const goFwd = () => {
    const next = fwd[0];
    if (!next) return;
    setFwd(fwd.slice(1));
    setBack([...back, curId]);
    setCur(next);
    setSel(null);
  };

  const open = (n: FsNode) => {
    if (inTrash) return notify("Tempat Sampah", "Pulihkan file dulu untuk membukanya.");
    if (n.type === "folder") go(n.id);
    else openNode(n);
  };

  const startRename = (id: string) => {
    if (isProtected(id) || inTrash) return;
    setRenaming(id);
    setDraft(nodes[id]?.name ?? "");
  };
  const commitRename = () => {
    if (renaming) rename(renaming, draft);
    setRenaming(null);
  };
  const create = (kind: "folder" | "file") => {
    if (inTrash) return;
    const id = kind === "folder" ? mkdir(curId, "Folder baru") : touch(curId, "Dokumen baru.txt");
    setSel(id);
    setRenaming(id);
    setDraft(useFs.getState().nodes[id]?.name ?? "");
  };
  const del = (id: string) => {
    const n = nodes[id];
    if (!n || isProtected(id)) return;
    if (inTrash) {
      if (window.confirm(`Hapus permanen "${n.name}"?`)) deleteForever(id);
    } else {
      trash(id);
      notify("Dipindahkan ke Tempat Sampah", n.name);
    }
    setSel(null);
  };
  const doPaste = () => {
    if (inTrash) return;
    const n = paste(curId);
    if (n > 0) notify("Ditempel", `${n} item`);
  };

  const onDropTo = (e: RDragEvent, target: string) => {
    const p = readDrag(e);
    setDropOn(null);
    if (!p || p.kind !== "node" || p.id === target) return;
    e.preventDefault();
    e.stopPropagation();
    if (target === TRASH) trash(p.id);
    else move(p.id, target);
  };
  const dropProps = (target: string, enabled = true) => ({
    onDragOver: (e: RDragEvent) => {
      if (enabled && hasDrag(e)) {
        e.preventDefault();
        e.stopPropagation();
        setDropOn(target);
      }
    },
    onDragLeave: () => setDropOn((d) => (d === target ? null : d)),
    onDrop: (e: RDragEvent) => enabled && onDropTo(e, target),
  });

  const buildMenu = (target: string | null): MenuItem[] => {
    const n = target ? nodes[target] : undefined;
    if (target && n) {
      if (inTrash) {
        return [
          { label: "Pulihkan", icon: Undo2, onClick: () => restore(target) },
          { sep: true },
          { label: "Hapus permanen", icon: Trash2, danger: true, onClick: () => del(target) },
        ];
      }
      return [
        { label: "Buka", icon: FolderOpen, onClick: () => open(n) },
        { label: "Salin", icon: Copy, onClick: () => setClipboard([target], "copy") },
        { label: "Potong", icon: Scissors, onClick: () => setClipboard([target], "cut") },
        { label: "Ganti nama", icon: Pencil, onClick: () => startRename(target) },
        { sep: true },
        { label: "Hapus", icon: Trash2, danger: true, onClick: () => del(target) },
      ];
    }
    if (inTrash) return [{ label: "Kosongkan Tempat Sampah", icon: Trash2, danger: true, onClick: () => emptyTrash() }];
    const list: MenuItem[] = [
      { label: "Folder baru", icon: FolderPlus, onClick: () => create("folder") },
      { label: "File teks baru", icon: FilePlus, onClick: () => create("file") },
    ];
    if (clipboard) list.push({ sep: true }, { label: "Tempel", icon: ClipboardPaste, onClick: doPaste });
    return list;
  };

  const ctx = (e: RMouseEvent, target: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (target) setSel(target);
    setMenu({ x: e.clientX, y: e.clientY, target });
  };

  return (
    <div
      className="ex"
      tabIndex={0}
      onKeyDown={(e) => {
        if (renaming) return;
        const mod = e.ctrlKey || e.metaKey;
        const k = e.key.toLowerCase();
        if (e.key === "F2" && sel) startRename(sel);
        else if (e.key === "Delete" && sel) del(sel);
        else if (mod && k === "c" && sel && !inTrash) setClipboard([sel], "copy");
        else if (mod && k === "x" && sel && !inTrash) setClipboard([sel], "cut");
        else if (mod && k === "v") {
          e.preventDefault();
          doPaste();
        }
      }}
    >
      <div className="ex-bar">
        <button className="icon-btn" aria-label="Kembali" disabled={back.length === 0} onClick={goBack}>
          <ArrowLeft size={16} />
        </button>
        <button className="icon-btn" aria-label="Maju" disabled={fwd.length === 0} onClick={goFwd}>
          <ArrowRight size={16} />
        </button>
        <button className="icon-btn" aria-label="Naik satu level" disabled={!canUp} onClick={() => parent && go(parent)}>
          <ArrowUp size={16} />
        </button>
        <div className="ex-crumbs">
          {crumbs.map((c, i) => (
            <span key={c.id}>
              {i > 0 && <ChevronRight size={13} />}
              <button onClick={() => go(c.id)}>{c.name}</button>
            </span>
          ))}
        </div>
        {inTrash ? (
          <button className="btn ghost" onClick={() => emptyTrash()} disabled={items.length === 0}>
            <Trash2 size={14} /> Kosongkan
          </button>
        ) : (
          <>
            <button className="icon-btn" aria-label="Folder baru" onClick={() => create("folder")}>
              <FolderPlus size={16} />
            </button>
            <button className="icon-btn" aria-label="Tempel" disabled={!clipboard} onClick={doPaste}>
              <ClipboardPaste size={16} />
            </button>
          </>
        )}
        <label className="ex-search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari di sini" />
        </label>
        <button
          className="icon-btn"
          aria-label={view === "grid" ? "Tampilan daftar" : "Tampilan ikon"}
          onClick={() => setView(view === "grid" ? "list" : "grid")}
        >
          {view === "grid" ? <List size={16} /> : <LayoutGrid size={16} />}
        </button>
      </div>

      <div className="ex-wrap">
        <nav className="ex-side">
          {side.map((s) => (
            <button
              key={s.id}
              className={(curId === s.id ? "on" : "") + (dropOn === s.id ? " drop" : "")}
              onClick={() => go(s.id)}
              {...dropProps(s.id)}
            >
              <s.icon size={16} /> {s.label}
            </button>
          ))}
        </nav>

        <div
          className={"ex-main" + (dropOn === curId ? " drop" : "")}
          onMouseDown={() => setSel(null)}
          onContextMenu={(e) => ctx(e, null)}
          {...dropProps(curId)}
        >
          {items.length === 0 && (
            <p className="muted empty">
              {q
                ? `Tidak ada hasil untuk “${q}”.`
                : inTrash
                ? "Tempat Sampah kosong."
                : "Folder ini kosong. Klik kanan untuk membuat folder atau file, atau seret file ke sini."}
            </p>
          )}
          <div className={view === "grid" ? "ex-grid" : "ex-list"}>
            {items.map((n) => (
              <div
                key={n.id}
                draggable={!renaming}
                className={"ex-item" + (sel === n.id ? " sel" : "") + (dropOn === n.id ? " drop" : "")}
                onDragStart={(e) => startDrag(e, { kind: "node", id: n.id })}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSel(n.id);
                }}
                onDoubleClick={() => open(n)}
                onContextMenu={(e) => ctx(e, n.id)}
                {...dropProps(n.id, n.type === "folder")}
              >
                {n.type === "folder" ? (
                  <Folder size={view === "grid" ? 38 : 18} color="#f2b441" fill="#f2b441" fillOpacity={0.25} />
                ) : isImage(n) ? (
                  <ImageIcon size={view === "grid" ? 34 : 18} color="#e879f9" />
                ) : (
                  <FileText size={view === "grid" ? 34 : 18} color="#4da3ff" />
                )}
                {renaming === n.id ? (
                  <input
                    className="ex-rename"
                    autoFocus
                    value={draft}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="ex-name">{n.name}</span>
                )}
                {view === "list" && (
                  <small>
                    {sizeLabel(n)} ·{" "}
                    {new Date(n.modified).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </small>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ex-status">
        {items.length} item{sel ? " · 1 dipilih" : ""}
        {clipboard ? ` · ${clipboard.mode === "cut" ? "dipotong" : "disalin"}: ${clipboard.ids.length}` : ""}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={buildMenu(menu.target)} onClose={() => setMenu(null)} />}
    </div>
  );
}
