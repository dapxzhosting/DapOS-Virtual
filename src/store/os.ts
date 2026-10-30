import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appIds, appMeta } from "../appMeta";
import { uid } from "../lib/uid";
import { playTone } from "../lib/sound";
import { safeStorage } from "../lib/storage";
import { wallpapers } from "../lib/wallpapers";
import type {
  Alarm, AppId, Bookmark, IconSize, Notice, Phase, StickyNote, TbAlign, TbPos, Theme, TimerState,
  Todo, UiMode, SearchEngine, WeatherLoc, WindowPayload, WindowState,
} from "../types";

export const TASKBAR_H = 52;
export const MAX_DESKS = 4;
const defaultLoc: WeatherLoc = { lat: -6.2088, lon: 106.8456, name: "Jakarta" };
const defaultBookmarks: Bookmark[] = [
  { title: "Wikipedia", url: "https://id.wikipedia.org" },
  { title: "MDN Web Docs", url: "https://developer.mozilla.org" },
  { title: "GitHub", url: "https://github.com" },
  { title: "Hacker News", url: "https://news.ycombinator.com" },
  { title: "Portofolio", url: "https://dafaalfiansyah.my.id" },
];
export const noteColors = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe"];

export const activeWindowId = (ws: WindowState[], desk: number): string | null => {
  let best: WindowState | null = null;
  for (const w of ws) if (w.desk === desk && !w.minimized && (!best || w.z > best.z)) best = w;
  return best ? best.id : null;
};

export type SnapHint = "left" | "right" | "top" | null;
export type SnapSide = "left" | "right" | "max" | "restore";

interface OSState {
  phase: Phase;
  windows: WindowState[];
  topZ: number;
  startOpen: boolean;
  panelOpen: boolean;
  widgetsOpen: boolean;
  taskView: boolean;
  snapHint: SnapHint;
  desks: number;
  currentDesk: number;
  toasts: Notice[];
  history: Notice[];
  bootedAt: number;
  timer: TimerState;

  wallpaper: string;
  accent: string;
  theme: Theme;
  userName: string;
  brightness: number;
  installed: AppId[];
  iconPos: Record<string, { x: number; y: number }>;
  notes: StickyNote[];
  alarms: Alarm[];
  todos: Todo[];
  iconSize: IconSize;
  tbPos: TbPos;
  tbAlign: TbAlign;
  sounds: boolean;
  clock24: boolean;
  uiMode: UiMode;
  pinHash: string | null;
  weatherLoc: WeatherLoc;
  bookmarks: Bookmark[];
  searchEngine: SearchEngine;

  setPhase: (p: Phase) => void;
  openApp: (id: AppId, payload?: WindowPayload) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveResize: (id: string, p: Partial<WindowState>) => void;
  setTitle: (id: string, title: string) => void;
  showDesktop: () => void;
  snapWindow: (id: string, side: SnapSide) => void;
  setSnapHint: (h: SnapHint) => void;
  toggleStart: () => void;
  togglePanel: () => void;
  toggleWidgets: () => void;
  toggleTaskView: () => void;
  closeMenus: () => void;
  goDesk: (n: number) => void;
  addDesk: () => void;
  removeDesk: (i: number) => void;
  moveWindowToDesk: (id: string, desk: number) => void;
  notify: (title: string, body: string) => void;
  dismissToast: (id: string) => void;
  clearHistory: () => void;
  install: (id: AppId) => void;
  uninstall: (id: AppId) => void;
  setIconPos: (key: string, pos: { x: number; y: number }) => void;
  resetIconPos: () => void;
  addNote: () => void;
  updateNote: (id: string, p: Partial<StickyNote>) => void;
  removeNote: (id: string) => void;
  addAlarm: (time: string, label: string) => void;
  toggleAlarm: (id: string) => void;
  removeAlarm: (id: string) => void;
  startTimer: (sec: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  setWallpaper: (css: string) => void;
  setAccent: (hex: string) => void;
  setTheme: (t: Theme) => void;
  setUserName: (n: string) => void;
  setBrightness: (n: number) => void;
  setIconSize: (v: IconSize) => void;
  setTbPos: (v: TbPos) => void;
  setTbAlign: (v: TbAlign) => void;
  setSounds: (v: boolean) => void;
  setClock24: (v: boolean) => void;
  setUiMode: (v: UiMode) => void;
  setPinHash: (h: string | null) => void;
  setWeatherLoc: (l: WeatherLoc) => void;
  addBookmark: (b: Bookmark) => void;
  removeBookmark: (url: string) => void;
  setSearchEngine: (e: SearchEngine) => void;
  importSettings: (s: Record<string, unknown>) => void;
}

const SETTINGS_KEYS = [
  "wallpaper", "accent", "theme", "userName", "brightness", "installed", "iconPos", "notes",
  "alarms", "todos", "iconSize", "tbPos", "tbAlign", "sounds", "clock24", "uiMode", "weatherLoc", "bookmarks", "searchEngine",
] as const;

export const exportSettings = (): Record<string, unknown> => {
  const s = useOS.getState() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of SETTINGS_KEYS) out[k] = s[k];
  return out;
};

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      phase: "boot",
      windows: [],
      topZ: 10,
      startOpen: false,
      panelOpen: false,
      widgetsOpen: false,
      taskView: false,
      snapHint: null,
      desks: 1,
      currentDesk: 0,
      toasts: [],
      history: [],
      bootedAt: Date.now(),
      timer: { end: null, total: 0, left: null },

      wallpaper: wallpapers[0].css,
      accent: "#2dd4bf",
      theme: "dark",
      userName: "Dap",
      brightness: 100,
      installed: [...appIds],
      iconPos: {},
      notes: [],
      alarms: [],
      todos: [],
      iconSize: "md",
      tbPos: "bottom",
      tbAlign: "center",
      sounds: true,
      clock24: true,
      uiMode: "auto",
      pinHash: null,
      weatherLoc: defaultLoc,
      bookmarks: defaultBookmarks,
      searchEngine: "ddg",

      setPhase: (p) =>
        set({
          phase: p,
          startOpen: false,
          panelOpen: false,
          widgetsOpen: false,
          taskView: false,
          ...(p === "boot" || p === "off" ? { windows: [], desks: 1, currentDesk: 0, bootedAt: Date.now() } : {}),
        }),

      openApp: (id, payload) => {
        const meta = appMeta[id];
        const st = get();
        if (!st.installed.includes(id)) {
          st.notify("Aplikasi belum dipasang", `${meta.title} bisa dipasang dari Toko Aplikasi.`);
          return;
        }
        if (meta.noWindow) {
          if (id === "sticky") get().addNote();
          set({ startOpen: false, panelOpen: false, widgetsOpen: false });
          return;
        }
        if (meta.single) {
          const ex = st.windows.find((w) => w.appId === id);
          if (ex) {
            get().focusWindow(ex.id);
            return;
          }
        }
        const z = st.topZ + 1;
        const n = st.windows.filter((w) => w.desk === st.currentDesk).length;
        const vw = window.innerWidth;
        const vh = window.innerHeight - TASKBAR_H;
        const w = Math.min(meta.w, vw - 16);
        const h = Math.min(meta.h, vh - 16);
        const x = Math.max(8, Math.min(70 + (n % 8) * 30, vw - w - 8));
        const y = Math.max(8, Math.min(36 + (n % 8) * 30, vh - h - 8));
        set((s) => ({
          topZ: z,
          startOpen: false,
          panelOpen: false,
          widgetsOpen: false,
          taskView: false,
          windows: [
            ...s.windows,
            { id: uid(), appId: id, title: meta.title, x, y, w, h, z, minimized: false, maximized: false, desk: s.currentDesk, payload },
          ],
        }));
      },

      closeWindow: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

      focusWindow: (id) => {
        const z = get().topZ + 1;
        set((s) => {
          const win = s.windows.find((w) => w.id === id);
          return {
            topZ: z,
            startOpen: false,
            panelOpen: false,
            widgetsOpen: false,
            currentDesk: win ? win.desk : s.currentDesk,
            windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)),
          };
        });
      },

      toggleMinimize: (id) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)) })),

      toggleMaximize: (id) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized, snap: null } : w)),
        })),

      moveResize: (id, p) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...p } : w)) })),

      setTitle: (id, title) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id && w.title !== title ? { ...w, title } : w)) })),

      showDesktop: () =>
        set((s) => {
          const anyVisible = s.windows.some((w) => w.desk === s.currentDesk && !w.minimized);
          return {
            startOpen: false,
            panelOpen: false,
            widgetsOpen: false,
            windows: s.windows.map((w) => (w.desk === s.currentDesk ? { ...w, minimized: anyVisible } : w)),
          };
        }),

      snapWindow: (id, side) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight - TASKBAR_H;
        const half = Math.floor(vw / 2);
        set((s) => ({
          windows: s.windows.map((w) => {
            if (w.id !== id) return w;
            const prev = w.prev ?? { x: w.x, y: w.y, w: w.w, h: w.h };
            if (side === "restore") {
              if (w.maximized) return { ...w, maximized: false, snap: null };
              if (w.prev) return { ...w, ...w.prev, snap: null, prev: undefined };
              return { ...w, minimized: true };
            }
            if (side === "max") return { ...w, maximized: true, snap: null, prev };
            const x = side === "left" ? 0 : vw - half;
            return { ...w, maximized: false, snap: side, prev, x, y: 0, w: half, h: vh, minimized: false };
          }),
        }));
      },

      setSnapHint: (h) => set((s) => (s.snapHint === h ? s : { snapHint: h })),

      toggleStart: () => set((s) => ({ startOpen: !s.startOpen, panelOpen: false, widgetsOpen: false })),
      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen, startOpen: false, widgetsOpen: false })),
      toggleWidgets: () => set((s) => ({ widgetsOpen: !s.widgetsOpen, startOpen: false, panelOpen: false })),
      toggleTaskView: () => set((s) => ({ taskView: !s.taskView, startOpen: false, panelOpen: false, widgetsOpen: false })),
      closeMenus: () =>
        set((s) =>
          s.startOpen || s.panelOpen || s.widgetsOpen ? { startOpen: false, panelOpen: false, widgetsOpen: false } : s
        ),

      goDesk: (n) =>
        set((s) => ({
          currentDesk: Math.max(0, Math.min(n, s.desks - 1)),
          startOpen: false,
          panelOpen: false,
          widgetsOpen: false,
        })),
      addDesk: () =>
        set((s) => (s.desks >= MAX_DESKS ? s : { desks: s.desks + 1, currentDesk: s.desks })),
      removeDesk: (i) =>
        set((s) => {
          if (s.desks <= 1 || i < 0 || i >= s.desks) return s;
          const windows = s.windows.map((w) =>
            w.desk === i ? { ...w, desk: Math.max(0, i - 1) } : w.desk > i ? { ...w, desk: w.desk - 1 } : w
          );
          const cur = s.currentDesk === i ? Math.max(0, i - 1) : s.currentDesk > i ? s.currentDesk - 1 : s.currentDesk;
          return { desks: s.desks - 1, currentDesk: cur, windows };
        }),
      moveWindowToDesk: (id, desk) =>
        set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, desk } : w)) })),

      notify: (title, body) => {
        const n: Notice = { id: uid(), title, body, ts: Date.now() };
        if (get().sounds) playTone("notify");
        set((s) => ({ toasts: [...s.toasts, n].slice(-4), history: [n, ...s.history].slice(0, 30) }));
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      clearHistory: () => set({ history: [] }),

      install: (id) => set((s) => (s.installed.includes(id) ? s : { installed: [...s.installed, id] })),
      uninstall: (id) =>
        set((s) =>
          appMeta[id].core
            ? s
            : { installed: s.installed.filter((x) => x !== id), windows: s.windows.filter((w) => w.appId !== id) }
        ),

      setIconPos: (key, pos) => set((s) => ({ iconPos: { ...s.iconPos, [key]: pos } })),
      resetIconPos: () => set({ iconPos: {} }),

      addNote: () =>
        set((s) => {
          const i = s.notes.length;
          const note: StickyNote = {
            id: uid(),
            text: "",
            x: 220 + (i % 6) * 34,
            y: 40 + (i % 6) * 34,
            color: noteColors[i % noteColors.length] ?? "#fde68a",
          };
          return { notes: [...s.notes, note] };
        }),
      updateNote: (id, p) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...p } : n)) })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      addAlarm: (time, label) =>
        set((s) => ({ alarms: [...s.alarms, { id: uid(), time, label, on: true }].sort((a, b) => a.time.localeCompare(b.time)) })),
      toggleAlarm: (id) => set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, on: !a.on } : a)) })),
      removeAlarm: (id) => set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id) })),

      startTimer: (sec) => set({ timer: { end: Date.now() + sec * 1000, total: sec, left: null } }),
      pauseTimer: () =>
        set((s) =>
          s.timer.end ? { timer: { ...s.timer, left: Math.max(0, s.timer.end - Date.now()), end: null } } : s
        ),
      resumeTimer: () =>
        set((s) =>
          s.timer.left !== null && s.timer.end === null
            ? { timer: { ...s.timer, end: Date.now() + s.timer.left, left: null } }
            : s
        ),
      cancelTimer: () => set({ timer: { end: null, total: 0, left: null } }),

      addTodo: (text) => set((s) => ({ todos: [...s.todos, { id: uid(), text, done: false }] })),
      toggleTodo: (id) => set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      removeTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

      setWallpaper: (wallpaper) => set({ wallpaper }),
      setAccent: (accent) => set({ accent }),
      setTheme: (theme) => set({ theme }),
      setUserName: (userName) => set({ userName }),
      setBrightness: (brightness) => set({ brightness }),
      setIconSize: (iconSize) => set({ iconSize }),
      setTbPos: (tbPos) => set({ tbPos }),
      setTbAlign: (tbAlign) => set({ tbAlign }),
      setSounds: (sounds) => set({ sounds }),
      setClock24: (clock24) => set({ clock24 }),
      setUiMode: (uiMode) => set({ uiMode }),
      setPinHash: (pinHash) => set({ pinHash }),
      setWeatherLoc: (weatherLoc) => set({ weatherLoc }),
      addBookmark: (b) => set((s) => (s.bookmarks.some((x) => x.url === b.url) ? s : { bookmarks: [...s.bookmarks, b].slice(-24) })),
      removeBookmark: (url) => set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.url !== url) })),
      setSearchEngine: (searchEngine) => set({ searchEngine }),

      importSettings: (src) => {
        const next: Partial<OSState> = {};
        if (typeof src.wallpaper === "string") next.wallpaper = src.wallpaper;
        if (typeof src.accent === "string") next.accent = src.accent;
        if (src.theme === "dark" || src.theme === "light") next.theme = src.theme;
        if (typeof src.userName === "string") next.userName = src.userName.slice(0, 20) || "Dap";
        if (typeof src.brightness === "number") next.brightness = Math.max(40, Math.min(100, src.brightness));
        if (Array.isArray(src.installed)) {
          const ids = src.installed.filter((x): x is AppId => typeof x === "string" && (appIds as string[]).includes(x));
          const core = appIds.filter((i) => appMeta[i].core);
          next.installed = Array.from(new Set([...core, ...ids]));
        }
        if (src.iconPos && typeof src.iconPos === "object") next.iconPos = src.iconPos as OSState["iconPos"];
        if (Array.isArray(src.notes)) next.notes = src.notes as StickyNote[];
        if (Array.isArray(src.alarms)) next.alarms = src.alarms as Alarm[];
        if (Array.isArray(src.todos)) next.todos = src.todos as Todo[];
        if (src.iconSize === "sm" || src.iconSize === "md" || src.iconSize === "lg") next.iconSize = src.iconSize;
        if (src.tbPos === "top" || src.tbPos === "bottom") next.tbPos = src.tbPos;
        if (src.tbAlign === "left" || src.tbAlign === "center") next.tbAlign = src.tbAlign;
        if (typeof src.sounds === "boolean") next.sounds = src.sounds;
        if (typeof src.clock24 === "boolean") next.clock24 = src.clock24;
        if (src.weatherLoc && typeof src.weatherLoc === "object") next.weatherLoc = src.weatherLoc as WeatherLoc;
        if (Array.isArray(src.bookmarks)) next.bookmarks = src.bookmarks as Bookmark[];
        if (src.searchEngine === "ddg" || src.searchEngine === "bing" || src.searchEngine === "wiki") next.searchEngine = src.searchEngine;
        set(next);
      },
    }),
    {
      name: "dapos-os",
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        wallpaper: s.wallpaper,
        accent: s.accent,
        theme: s.theme,
        userName: s.userName,
        brightness: s.brightness,
        installed: s.installed,
        iconPos: s.iconPos,
        notes: s.notes,
        alarms: s.alarms,
        todos: s.todos,
        iconSize: s.iconSize,
        tbPos: s.tbPos,
        tbAlign: s.tbAlign,
        sounds: s.sounds,
        clock24: s.clock24,
        uiMode: s.uiMode,
        pinHash: s.pinHash,
        weatherLoc: s.weatherLoc,
        bookmarks: s.bookmarks,
        searchEngine: s.searchEngine,
      }),
    }
  )
);
