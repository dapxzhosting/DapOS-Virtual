import type { ComponentType } from "react";
import type { AppId, AppProps } from "./types";
import Explorer from "./apps/Explorer";
import Notepad from "./apps/Notepad";
import Terminal from "./apps/Terminal";
import Calculator from "./apps/Calculator";
import Settings from "./apps/Settings";
import Browser from "./apps/Browser";
import Paint from "./apps/Paint";
import TaskManager from "./apps/TaskManager";
import Portfolio from "./apps/Portfolio";
import AppStore from "./apps/AppStore";
import Gallery from "./apps/Gallery";
import CodeEditor from "./apps/CodeEditor";
import Video from "./apps/Video";
import Games from "./apps/Games";
import Camera from "./apps/Camera";
import Clock from "./apps/Clock";

const Nothing = () => null;

export const appComponents: Record<AppId, ComponentType<AppProps>> = {
  explorer: Explorer,
  notepad: Notepad,
  terminal: Terminal,
  calculator: Calculator,
  settings: Settings,
  browser: Browser,
  paint: Paint,
  taskmgr: TaskManager,
  portfolio: Portfolio,
  store: AppStore,
  gallery: Gallery,
  editor: CodeEditor,
  video: Video,
  games: Games,
  camera: Camera,
  clock: Clock,
  sticky: Nothing,
};
