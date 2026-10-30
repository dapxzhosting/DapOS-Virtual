import { Bell, BatteryFull, PanelsTopLeft, Search, Volume2, Wifi } from "lucide-react";
import { useOS, activeWindowId } from "../store/os";
import { appMeta, pinnedIds } from "../appMeta";
import { useClock } from "../lib/useClock";
import { describeCode, useWeather } from "../lib/weather";
import Logo from "./Logo";
import WeatherIcon from "./WeatherIcon";
import type { AppId } from "../types";

export default function Taskbar() {
  const windows = useOS((s) => s.windows);
  const desk = useOS((s) => s.currentDesk);
  const desks = useOS((s) => s.desks);
  const installed = useOS((s) => s.installed);
  const clock24 = useOS((s) => s.clock24);
  const startOpen = useOS((s) => s.startOpen);
  const panelOpen = useOS((s) => s.panelOpen);
  const widgetsOpen = useOS((s) => s.widgetsOpen);
  const taskView = useOS((s) => s.taskView);
  const unread = useOS((s) => s.history.length);
  const openApp = useOS((s) => s.openApp);
  const focusWindow = useOS((s) => s.focusWindow);
  const toggleMinimize = useOS((s) => s.toggleMinimize);
  const toggleStart = useOS((s) => s.toggleStart);
  const togglePanel = useOS((s) => s.togglePanel);
  const toggleWidgets = useOS((s) => s.toggleWidgets);
  const toggleTaskView = useOS((s) => s.toggleTaskView);
  const showDesktop = useOS((s) => s.showDesktop);
  const now = useClock(15000);
  const { data: weather } = useWeather();

  const here = windows.filter((w) => w.desk === desk);
  const activeId = activeWindowId(windows, desk);
  const running = Array.from(new Set(here.map((w) => w.appId)));
  const pinned = pinnedIds.filter((id) => installed.includes(id));
  const items: AppId[] = [...pinned, ...running.filter((id) => !pinned.includes(id))];

  const click = (id: AppId) => {
    const wins = here.filter((w) => w.appId === id);
    if (wins.length === 0) return openApp(id);
    const top = wins.reduce((a, b) => (a.z > b.z ? a : b));
    if (top.id === activeId) toggleMinimize(top.id);
    else focusWindow(top.id);
  };

  const wd = weather ? describeCode(weather.code) : null;

  return (
    <div
      className="taskbar"
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="tb-left">
        <button className={"tb-widget" + (widgetsOpen ? " on" : "")} onClick={toggleWidgets} aria-label="Widget">
          {wd && weather ? (
            <>
              <WeatherIcon kind={wd.kind} size={22} />
              <span>
                <b>{weather.temp}°C</b>
                <small>{wd.label}</small>
              </span>
            </>
          ) : (
            <span>
              <b>Widget</b>
              <small>Cuaca & tugas</small>
            </span>
          )}
        </button>
      </div>

      <div className="tb-center">
        <button className={"tb-btn" + (startOpen ? " on" : "")} aria-label="Menu Mulai" onClick={toggleStart}>
          <Logo size={24} />
        </button>
        <button className="tb-search" onClick={toggleStart}>
          <Search size={14} /> Cari
        </button>
        <button
          className={"tb-btn" + (taskView ? " on" : "")}
          aria-label="Task View"
          title="Task View (Alt+V)"
          onClick={toggleTaskView}
        >
          <PanelsTopLeft size={20} />
          {desks > 1 && <span className="tb-desk">{desk + 1}</span>}
        </button>
        {items.map((id) => {
          const meta = appMeta[id];
          const Icon = meta.icon;
          const wins = here.filter((w) => w.appId === id);
          const isActive = wins.some((w) => w.id === activeId);
          return (
            <button
              key={id}
              className={"tb-btn" + (isActive ? " on" : "")}
              title={meta.title}
              aria-label={meta.title}
              onClick={() => click(id)}
            >
              <Icon size={21} style={{ color: meta.color }} />
              {wins.length > 0 && <i className={"tb-dot" + (isActive ? " act" : "")} />}
            </button>
          );
        })}
      </div>

      <div className="tb-right">
        <button className={"tb-tray" + (panelOpen ? " on" : "")} onClick={togglePanel} aria-label="Panel cepat">
          <Wifi size={15} />
          <Volume2 size={15} />
          <BatteryFull size={16} />
          <span className="tb-clock">
            <b>
              {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: !clock24 }).replace(".", ":")}
            </b>
            <small>{now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}</small>
          </span>
          <span className="tb-bell">
            <Bell size={15} />
            {unread > 0 && <i />}
          </span>
        </button>
        <button className="tb-show" aria-label="Tampilkan desktop" title="Tampilkan desktop" onClick={showDesktop} />
      </div>
    </div>
  );
}
