import { appMeta } from "../appMeta";
import type { WindowState } from "../types";

export default function Switcher({ wins, index }: { wins: WindowState[]; index: number }) {
  return (
    <div className="switcher">
      {wins.map((w, i) => {
        const m = appMeta[w.appId];
        return (
          <div key={w.id} className={"sw-item" + (i === index ? " on" : "")}>
            <span className="tile" style={{ background: m.color }}>
              <m.icon size={24} color="#fff" />
            </span>
            <span>{w.title}</span>
          </div>
        );
      })}
    </div>
  );
}
