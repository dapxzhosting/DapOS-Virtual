import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { safeStorage } from "../lib/storage";

export interface FsNode {
  id: string;
  name: string;
  type: "folder" | "file";
  parent: string | null;
  content: string;
  created: number;
  modified: number;
  origParent?: string;
}

export const ROOT = "root";
export const TRASH = "trash";
const PROTECTED = new Set([ROOT, TRASH, "desktop", "documents", "pictures", "music"]);
export type Nodes = Record<string, FsNode>;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function seed(): Nodes {
  const t = Date.now();
  const mk = (id: string, name: string, type: FsNode["type"], parent: string | null, content = ""): FsNode => ({
    id, name, type, parent, content, created: t, modified: t,
  });
  const list: FsNode[] = [
    mk(ROOT, "Beranda", "folder", null),
    mk(TRASH, "Tempat Sampah", "folder", null),
    mk("desktop", "Desktop", "folder", ROOT),
    mk("documents", "Dokumen", "folder", ROOT),
    mk("pictures", "Gambar", "folder", ROOT),
    mk("music", "Musik", "folder", ROOT),
    mk(
      "welcome",
      "selamat-datang.txt",
      "file",
      "documents",
      "Selamat datang di DapOS!\n\nBeberapa hal yang bisa dicoba:\n- Buka Terminal dan ketik 'help'\n- Seret ikon desktop ke posisi mana saja\n- Seret jendela ke tepi layar untuk snap\n- Alt+V untuk Task View, Alt+1..4 untuk pindah desktop virtual\n- Pasang atau copot aplikasi di Toko Aplikasi\n\nSemua file disimpan di browser kamu (localStorage).\n"
    ),
  ];
  return Object.fromEntries(list.map((n) => [n.id, n]));
}

export function childrenOf(nodes: Nodes, id: string): FsNode[] {
  return Object.values(nodes)
    .filter((n) => n.parent === id)
    .sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name, "id") : a.type === "folder" ? -1 : 1
    );
}

export function isTrashed(nodes: Nodes, id: string): boolean {
  let cur: FsNode | undefined = nodes[id];
  let guard = 0;
  while (cur && guard++ < 100) {
    if (cur.id === TRASH) return true;
    cur = cur.parent ? nodes[cur.parent] : undefined;
  }
  return false;
}

export function liveFiles(nodes: Nodes): FsNode[] {
  return Object.values(nodes).filter((n) => n.type === "file" && !isTrashed(nodes, n.id));
}

export function pathOf(nodes: Nodes, id: string): string {
  const parts: string[] = [];
  let cur: FsNode | undefined = nodes[id];
  let root: FsNode | undefined;
  let guard = 0;
  while (cur && guard++ < 100) {
    if (cur.parent === null) {
      root = cur;
      break;
    }
    parts.unshift(cur.name);
    cur = nodes[cur.parent];
  }
  const base = root?.id === TRASH ? "~/Tempat Sampah" : "~";
  return parts.length ? base + "/" + parts.join("/") : base;
}

export function chainOf(nodes: Nodes, id: string): FsNode[] {
  const out: FsNode[] = [];
  let cur: FsNode | undefined = nodes[id];
  let guard = 0;
  while (cur && guard++ < 100) {
    out.unshift(cur);
    cur = cur.parent ? nodes[cur.parent] : undefined;
  }
  return out;
}

export function resolvePath(nodes: Nodes, cwd: string, input: string): string | null {
  let parts = input.split("/").filter((p) => p !== "");
  let cur = cwd;
  if (input.startsWith("/") || input.startsWith("~")) {
    cur = ROOT;
    if (parts[0] === "~") parts = parts.slice(1);
  }
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") {
      cur = nodes[cur]?.parent ?? cur;
      continue;
    }
    const next = childrenOf(nodes, cur).find((n) => n.name.toLowerCase() === p.toLowerCase());
    if (!next) return null;
    cur = next.id;
  }
  return cur;
}

function uniqueName(nodes: Nodes, parent: string, name: string): string {
  const taken = new Set(childrenOf(nodes, parent).map((n) => n.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  while (taken.has(`${base} (${i})${ext}`.toLowerCase())) i++;
  return `${base} (${i})${ext}`;
}

export const isProtected = (id: string) => PROTECTED.has(id);

interface Clip { ids: string[]; mode: "copy" | "cut" }

interface FsState {
  nodes: Nodes;
  clipboard: Clip | null;
  mkdir: (parent: string, name: string) => string;
  touch: (parent: string, name: string, content?: string) => string;
  write: (id: string, content: string) => void;
  rename: (id: string, name: string) => void;
  trash: (id: string) => void;
  restore: (id: string) => void;
  deleteForever: (id: string) => void;
  emptyTrash: () => void;
  move: (id: string, parent: string) => void;
  copy: (id: string, parent: string) => void;
  setClipboard: (ids: string[], mode: "copy" | "cut") => void;
  paste: (parent: string) => number;
  replaceAll: (nodes: Nodes) => void;
}

function descendants(nodes: Nodes, id: string): Set<string> {
  const set = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of Object.values(nodes)) {
      if (n.parent && set.has(n.parent) && !set.has(n.id)) {
        set.add(n.id);
        grew = true;
      }
    }
  }
  return set;
}

export const useFs = create<FsState>()(
  persist(
    (set, get) => ({
      nodes: seed(),
      clipboard: null,

      mkdir: (parent, name) => {
        const id = uid();
        const t = Date.now();
        const nm = uniqueName(get().nodes, parent, name.trim() || "Folder baru");
        set((s) => ({
          nodes: { ...s.nodes, [id]: { id, name: nm, type: "folder", parent, content: "", created: t, modified: t } },
        }));
        return id;
      },

      touch: (parent, name, content = "") => {
        const id = uid();
        const t = Date.now();
        const nm = uniqueName(get().nodes, parent, name.trim() || "Dokumen baru.txt");
        set((s) => ({
          nodes: { ...s.nodes, [id]: { id, name: nm, type: "file", parent, content, created: t, modified: t } },
        }));
        return id;
      },

      write: (id, content) =>
        set((s) => {
          const n = s.nodes[id];
          if (!n) return s;
          return { nodes: { ...s.nodes, [id]: { ...n, content, modified: Date.now() } } };
        }),

      rename: (id, name) =>
        set((s) => {
          const n = s.nodes[id];
          const clean = name.trim();
          if (!n || !n.parent || PROTECTED.has(id) || !clean || clean === n.name) return s;
          const nm = uniqueName(s.nodes, n.parent, clean);
          return { nodes: { ...s.nodes, [id]: { ...n, name: nm, modified: Date.now() } } };
        }),

      trash: (id) =>
        set((s) => {
          const n = s.nodes[id];
          if (!n || PROTECTED.has(id) || isTrashed(s.nodes, id)) return s;
          const nm = uniqueName(s.nodes, TRASH, n.name);
          return { nodes: { ...s.nodes, [id]: { ...n, name: nm, parent: TRASH, origParent: n.parent ?? ROOT } } };
        }),

      restore: (id) =>
        set((s) => {
          const n = s.nodes[id];
          if (!n || n.parent !== TRASH) return s;
          const want = n.origParent;
          const dest = want && s.nodes[want] && !isTrashed(s.nodes, want) ? want : ROOT;
          const nm = uniqueName(s.nodes, dest, n.name);
          return { nodes: { ...s.nodes, [id]: { ...n, name: nm, parent: dest, origParent: undefined } } };
        }),

      deleteForever: (id) =>
        set((s) => {
          if (PROTECTED.has(id) || !s.nodes[id]) return s;
          const doomed = descendants(s.nodes, id);
          const next: Nodes = {};
          for (const n of Object.values(s.nodes)) if (!doomed.has(n.id)) next[n.id] = n;
          return { nodes: next };
        }),

      emptyTrash: () =>
        set((s) => {
          const doomed = new Set<string>();
          for (const n of Object.values(s.nodes)) {
            if (n.parent === TRASH) descendants(s.nodes, n.id).forEach((d) => doomed.add(d));
          }
          const next: Nodes = {};
          for (const n of Object.values(s.nodes)) if (!doomed.has(n.id)) next[n.id] = n;
          return { nodes: next };
        }),

      move: (id, parent) => {
        if (parent === TRASH) return get().trash(id);
        set((s) => {
          const n = s.nodes[id];
          const dest = s.nodes[parent];
          if (!n || !dest || dest.type !== "folder" || PROTECTED.has(id)) return s;
          const fromTrash = n.parent === TRASH;
          if (n.parent === parent && !fromTrash) return s;
          let cur: FsNode | undefined = dest;
          let guard = 0;
          while (cur && guard++ < 100) {
            if (cur.id === id) return s;
            cur = cur.parent ? s.nodes[cur.parent] : undefined;
          }
          const nm = uniqueName(s.nodes, parent, n.name);
          return { nodes: { ...s.nodes, [id]: { ...n, name: nm, parent, origParent: undefined, modified: Date.now() } } };
        });
      },

      copy: (id, parent) =>
        set((s) => {
          const src = s.nodes[id];
          const dest = s.nodes[parent];
          if (!src || !dest || dest.type !== "folder" || PROTECTED.has(id)) return s;
          const next: Nodes = { ...s.nodes };
          const t = Date.now();
          const clone = (srcId: string, newParent: string, rename: boolean) => {
            const n = s.nodes[srcId];
            if (!n) return;
            const nid = uid();
            const name = rename ? uniqueName(next, newParent, n.name) : n.name;
            next[nid] = { ...n, id: nid, name, parent: newParent, origParent: undefined, created: t, modified: t };
            for (const c of Object.values(s.nodes)) if (c.parent === srcId) clone(c.id, nid, false);
          };
          clone(id, parent, true);
          return { nodes: next };
        }),

      setClipboard: (ids, mode) => set({ clipboard: ids.length ? { ids, mode } : null }),

      paste: (parent) => {
        const clip = get().clipboard;
        if (!clip) return 0;
        let n = 0;
        for (const id of clip.ids) {
          if (!get().nodes[id]) continue;
          if (clip.mode === "cut") get().move(id, parent);
          else get().copy(id, parent);
          n++;
        }
        if (clip.mode === "cut") set({ clipboard: null });
        return n;
      },

      replaceAll: (nodes) => {
        const next = { ...nodes };
        const base = seed();
        for (const k of Object.keys(base)) if (!next[k]) next[k] = base[k] as FsNode;
        set({ nodes: next });
      },
    }),
    {
      name: "dapos-fs",
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ nodes: s.nodes }),
      migrate: (persisted) => {
        const p = persisted as { nodes?: Nodes };
        const nodes: Nodes = { ...(p.nodes ?? {}) };
        if (!nodes[TRASH]) {
          const t = Date.now();
          nodes[TRASH] = { id: TRASH, name: "Tempat Sampah", type: "folder", parent: null, content: "", created: t, modified: t };
        }
        return { nodes } as unknown as FsState;
      },
    }
  )
);
