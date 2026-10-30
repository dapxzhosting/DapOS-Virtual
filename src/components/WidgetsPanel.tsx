import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Plus, Trash2, Wind } from "lucide-react";
import { useOS } from "../store/os";
import { describeCode, useWeather } from "../lib/weather";
import { useClock } from "../lib/useClock";
import WeatherIcon from "./WeatherIcon";

export default function WidgetsPanel() {
  const { data, error, loc } = useWeather();
  const setLoc = useOS((s) => s.setWeatherLoc);
  const notify = useOS((s) => s.notify);
  const todos = useOS((s) => s.todos);
  const addTodo = useOS((s) => s.addTodo);
  const toggleTodo = useOS((s) => s.toggleTodo);
  const removeTodo = useOS((s) => s.removeTodo);
  const clock24 = useOS((s) => s.clock24);
  const now = useClock(1000);
  const [text, setText] = useState("");

  const useMyLocation = () => {
    if (!navigator.geolocation) return notify("Lokasi", "Browser ini tidak mendukung geolokasi.");
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lon: p.coords.longitude, name: "Lokasi saya" }),
      () => notify("Lokasi", "Izin lokasi ditolak. Cuaca tetap memakai lokasi sebelumnya.")
    );
  };
  const add = () => {
    const t = text.trim();
    if (!t) return;
    addTodo(t);
    setText("");
  };
  const now_ = data ? describeCode(data.code) : null;

  return (
    <motion.div
      className="widgets"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <section className="card">
        <div className="card-head">
          <b>
            <MapPin size={13} style={{ verticalAlign: -2 }} /> {loc.name}
          </b>
          <button className="link" onClick={useMyLocation}>
            Pakai lokasi saya
          </button>
        </div>
        {error && !data && <p className="muted">Cuaca tidak tersedia. Periksa koneksi internet.</p>}
        {!error && !data && <p className="muted">Memuat cuaca…</p>}
        {data && now_ && (
          <>
            <div className="wx-now">
              <WeatherIcon kind={now_.kind} size={44} />
              <div>
                <div className="wx-temp">{data.temp}°C</div>
                <div className="muted">{now_.label}</div>
              </div>
              <div className="wx-wind">
                <Wind size={14} /> {data.wind} km/j
              </div>
            </div>
            <div className="wx-days">
              {data.daily.slice(1, 4).map((d) => {
                const k = describeCode(d.code);
                return (
                  <div key={d.date}>
                    <small>{new Date(d.date).toLocaleDateString("id-ID", { weekday: "short" })}</small>
                    <WeatherIcon kind={k.kind} size={20} />
                    <b>{d.max}°</b>
                    <small>{d.min}°</small>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <div className="wx-clock">
          <b>{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: !clock24 }).replace(/\./g, ":")}</b>
          <span className="muted">
            {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <b>Daftar tugas</b>
          <small className="muted">{todos.filter((t) => !t.done).length} belum selesai</small>
        </div>
        <div className="todo-add">
          <input
            className="input"
            placeholder="Tambah tugas…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="icon-btn" aria-label="Tambah tugas" onClick={add}>
            <Plus size={16} />
          </button>
        </div>
        {todos.length === 0 && <p className="muted">Belum ada tugas.</p>}
        {todos.map((t) => (
          <div key={t.id} className={"todo" + (t.done ? " done" : "")}>
            <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} />
            <span>{t.text}</span>
            <button className="icon-btn" aria-label="Hapus tugas" onClick={() => removeTodo(t.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </section>
    </motion.div>
  );
}
