import { create } from "zustand";
import type { AppId, WindowState } from "./types";
import { apps } from "./apps";

interface OSState {
  windows: WindowState[];
  topZ: number;
  wallpaper: string;
  openApp: (appId: AppId) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveResize: (id: string, p: Partial<WindowState>) => void;
  setWallpaper: (url: string) => void;
}

export const useOS = create<OSState>((set, get) => ({
  windows: [],
  topZ: 1,
  wallpaper: "linear-gradient(135deg,#1e3a8a,#7c3aed)",

  openApp: (appId) => {
    const app = apps[appId];
    if (!app) return;
    const z = get().topZ + 1;
    const n = get().windows.length;
    set((s) => ({
      topZ: z,
      windows: [
        ...s.windows,
        {
          id: crypto.randomUUID(),
          appId,
          title: app.title,
          x: 80 + n * 30,
          y: 60 + n * 30,
          w: 480,
          h: 320,
          z,
          minimized: false,
          maximized: false,
          desk: 0,
        },
      ],
    }));
  },

  closeWindow: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focusWindow: (id) => {
    const z = get().topZ + 1;
    set((s) => ({
      topZ: z,
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, z, minimized: false } : w
      ),
    }));
  },

  toggleMinimize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w
      ),
    })),

  toggleMaximize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized } : w
      ),
    })),

  moveResize: (id, p) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, ...p } : w)),
    })),

  setWallpaper: (wallpaper) => set({ wallpaper }),
}));
