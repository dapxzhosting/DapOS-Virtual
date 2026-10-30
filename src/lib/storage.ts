import type { StateStorage } from "zustand/middleware";

export const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      window.dispatchEvent(new Event("dapos-quota"));
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      window.dispatchEvent(new Event("dapos-quota"));
    }
  },
};
