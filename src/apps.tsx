import type { ComponentType } from "react";
import type { AppId } from "./types";
import { useOS } from "./store";

const Notepad = () => (
  <textarea
    style={{ width: "100%", height: "100%", border: 0, padding: 8, resize: "none", boxSizing: "border-box" }}
    placeholder="Tulis sesuatu..."
  />
);

const wallpapers = [
  "linear-gradient(135deg,#1e3a8a,#7c3aed)",
  "linear-gradient(135deg,#0f172a,#0ea5e9)",
  "linear-gradient(135deg,#7f1d1d,#f97316)",
];

const Settings = () => {
  const { wallpaper, setWallpaper } = useOS();
  return (
    <div style={{ padding: 12 }}>
      <h3>Wallpaper</h3>
      <div style={{ display: "flex", gap: 8 }}>
        {wallpapers.map((w) => (
          <button
            key={w}
            onClick={() => setWallpaper(w)}
            style={{
              width: 64,
              height: 40,
              background: w,
              border: w === wallpaper ? "2px solid #000" : "1px solid #ccc",
              borderRadius: 6,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const apps: Partial<Record<
  AppId,
  { title: string; icon: string; component: ComponentType }
>> = {
  notepad: { title: "Notepad", icon: "📝", component: Notepad },
  settings: { title: "Settings", icon: "⚙️", component: Settings },
};
