import { useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Trash2, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useOS } from "../store/os";

export const accents = ["#2dd4bf", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#a3e635"];

function Calendar() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = new Date();
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  const isToday = (d: number) =>
    d === today.getDate() && m === today.getMonth() && y === today.getFullYear();

  return (
    <div className="cal">
      <div className="cal-head">
        <b>{cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</b>
        <span>
          <button className="icon-btn" aria-label="Bulan sebelumnya" onClick={() => setCursor(new Date(y, m - 1, 1))}>
            <ChevronLeft size={16} />
          </button>
          <button className="icon-btn" aria-label="Bulan berikutnya" onClick={() => setCursor(new Date(y, m + 1, 1))}>
            <ChevronRight size={16} />
          </button>
        </span>
      </div>
      <div className="cal-grid">
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <small key={d}>{d}</small>
        ))}
        {cells.map((d, i) => (
          <span key={i} className={"cal-day" + (d && isToday(d) ? " today" : "")}>
            {d ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function QuickPanel() {
  const theme = useOS((s) => s.theme);
  const setTheme = useOS((s) => s.setTheme);
  const accent = useOS((s) => s.accent);
  const setAccent = useOS((s) => s.setAccent);
  const brightness = useOS((s) => s.brightness);
  const setBrightness = useOS((s) => s.setBrightness);
  const history = useOS((s) => s.history);
  const clearHistory = useOS((s) => s.clearHistory);
  const sounds = useOS((s) => s.sounds);
  const setSounds = useOS((s) => s.setSounds);

  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <section className="card">
        <div className="chips">
          <button className={"chip" + (theme === "dark" ? " on" : "")} onClick={() => setTheme("dark")}>
            <Moon size={15} /> Gelap
          </button>
          <button className={"chip" + (theme === "light" ? " on" : "")} onClick={() => setTheme("light")}>
            <Sun size={15} /> Terang
          </button>
          <button className={"chip" + (sounds ? " on" : "")} onClick={() => setSounds(!sounds)}>
            {sounds ? <Volume2 size={15} /> : <VolumeX size={15} />} Suara
          </button>
        </div>
        <label className="row">
          <span>Kecerahan</span>
          <input
            type="range"
            min={40}
            max={100}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
          />
        </label>
        <div className="row">
          <span>Aksen</span>
          <div className="swatches">
            {accents.map((c) => (
              <button
                key={c}
                aria-label={`Aksen ${c}`}
                className={"swatch" + (c === accent ? " on" : "")}
                style={{ background: c }}
                onClick={() => setAccent(c)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <b>Notifikasi</b>
          {history.length > 0 && (
            <button className="link" onClick={clearHistory}>
              <Trash2 size={13} /> Hapus semua
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="muted">Tidak ada notifikasi baru.</p>
        ) : (
          history.map((n) => (
            <div key={n.id} className="notif">
              <b>{n.title}</b>
              <span>{n.body}</span>
              <small>{new Date(n.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</small>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <Calendar />
      </section>
    </motion.div>
  );
}
