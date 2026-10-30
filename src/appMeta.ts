import {
  Activity, AlarmClock, Briefcase, Calculator, Camera, Code, FileText, Film, FolderOpen,
  Gamepad2, Globe, Image as ImageIcon, Paintbrush, Settings, SquareTerminal, StickyNote, Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppId } from "./types";

export interface AppMeta {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  w: number;
  h: number;
  single?: boolean;
  core?: boolean;
  noWindow?: boolean;
}

export const appMeta: Record<AppId, AppMeta> = {
  explorer: { title: "Penjelajah File", desc: "Kelola file dan folder, tempat sampah, salin dan tempel.", icon: FolderOpen, color: "#f2b441", w: 780, h: 480, core: true },
  notepad: { title: "Catatan", desc: "Editor teks sederhana yang menyimpan ke file.", icon: FileText, color: "#4da3ff", w: 560, h: 400 },
  terminal: { title: "Terminal", desc: "Shell mini dengan perintah ls, cd, cat, mkdir, dan lainnya.", icon: SquareTerminal, color: "#34d399", w: 680, h: 420 },
  calculator: { title: "Kalkulator", desc: "Kalkulator dengan dukungan keyboard.", icon: Calculator, color: "#a78bfa", w: 320, h: 480, single: true },
  settings: { title: "Pengaturan", desc: "Tampilan, taskbar, keamanan, dan sinkronisasi cloud.", icon: Settings, color: "#94a3b8", w: 860, h: 540, single: true, core: true },
  browser: { title: "Peramban", desc: "Buka situs web di dalam jendela.", icon: Globe, color: "#38bdf8", w: 900, h: 560 },
  paint: { title: "Lukis", desc: "Menggambar bebas, simpan ke folder Gambar.", icon: Paintbrush, color: "#fb7185", w: 740, h: 540 },
  taskmgr: { title: "Pengelola Tugas", desc: "Lihat dan akhiri jendela yang berjalan.", icon: Activity, color: "#f59e0b", w: 560, h: 420, single: true },
  portfolio: { title: "Portofolio", desc: "Portofolio Dafa Alfiansyah (dafaalfiansyah.my.id).", icon: Briefcase, color: "#f472b6", w: 980, h: 620, single: true, core: true },
  store: { title: "Toko Aplikasi", desc: "Pasang dan copot aplikasi DapOS.", icon: Store, color: "#22d3ee", w: 780, h: 540, single: true, core: true },
  gallery: { title: "Galeri", desc: "Lihat gambar, jadikan wallpaper, impor dari komputer.", icon: ImageIcon, color: "#e879f9", w: 840, h: 540, single: true },
  editor: { title: "Editor Kode", desc: "Editor Monaco dengan syntax highlighting.", icon: Code, color: "#60a5fa", w: 900, h: 560 },
  video: { title: "Pemutar Video", desc: "Putar video dari komputer atau alamat URL.", icon: Film, color: "#f87171", w: 760, h: 500 },
  games: { title: "Arkade", desc: "Minesweeper, Snake, dan 2048.", icon: Gamepad2, color: "#4ade80", w: 520, h: 640, single: true },
  camera: { title: "Kamera & Suara", desc: "Ambil foto dan rekam suara dengan perangkatmu.", icon: Camera, color: "#fb923c", w: 640, h: 540, single: true },
  clock: { title: "Jam", desc: "Jam dunia, alarm, timer, dan stopwatch.", icon: AlarmClock, color: "#2dd4bf", w: 560, h: 520, single: true },
  sticky: { title: "Catatan Tempel", desc: "Tempel catatan berwarna langsung di desktop.", icon: StickyNote, color: "#facc15", w: 0, h: 0, noWindow: true },
};

export const appIds = Object.keys(appMeta) as AppId[];
export const pinnedIds: AppId[] = ["explorer", "browser", "terminal", "notepad"];
export const desktopApps: AppId[] = ["portfolio", "explorer", "browser", "terminal", "notepad", "paint", "settings"];
