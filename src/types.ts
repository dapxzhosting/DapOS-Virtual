export type AppId =
  | "explorer" | "notepad" | "terminal" | "calculator" | "settings" | "browser"
  | "paint" | "taskmgr" | "portfolio" | "store" | "gallery" | "editor"
  | "video" | "games" | "camera" | "clock" | "sticky";

export type Phase = "boot" | "lock" | "login" | "desktop" | "off";
export type Theme = "dark" | "light";
export type UiMode = "auto" | "desktop" | "mobile";
export type TbPos = "bottom" | "top";
export type TbAlign = "center" | "left";
export type IconSize = "sm" | "md" | "lg";

export interface WindowPayload {
  fileId?: string;
  folderId?: string;
  tab?: string;
}

export interface Rect { x: number; y: number; w: number; h: number }

export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  desk: number;
  snap?: "left" | "right" | null;
  prev?: Rect;
  payload?: WindowPayload;
}

export interface AppProps { win: WindowState }

export interface Notice { id: string; title: string; body: string; ts: number }
export interface StickyNote { id: string; text: string; x: number; y: number; color: string }
export interface Alarm { id: string; time: string; label: string; on: boolean }
export interface Todo { id: string; text: string; done: boolean }
export interface TimerState { end: number | null; total: number; left: number | null }
export interface WeatherLoc { lat: number; lon: number; name: string }

export type SearchEngine = "ddg" | "bing" | "wiki";
export interface Bookmark { title: string; url: string }
