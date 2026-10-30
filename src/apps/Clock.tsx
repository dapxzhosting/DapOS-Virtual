import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, RotateCcw, Trash2, Flag } from "lucide-react";
import { useOS } from "../store/os";
import { useClock } from "../lib/useClock";

type Tab = "jam" | "alarm" | "timer" | "stopwatch";
const zones = [
  { name: "Jakarta", tz: "Asia/Jakarta" },
  { name: "Tokyo", tz: "Asia/Tokyo" },
  { name: "Sydney", tz: "Australia/Sydney" },
  { name: "London", tz: "Europe/London" },
  { name: "New York", tz: "America/New_York" },
  { name: "Los Angeles", tz: "America/Los_Angeles" },
];

function World() {
  const now = useClock(1000);
  const clock24 = useOS((s) => s.clock24);
  return (
    <div className="clk-pane">
      <div className="clk-big">
        {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: !clock24 }).replace(/\./g, ":")}
      </div>
      <p className="muted">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      <div className="clk-zones">
        {zones.map((z) => (
          <div key={z.tz}>
            <span>{z.name}</span>
            <b>
              {new Intl.DateTimeFormat("id-ID", { timeZone: z.tz, hour: "2-digit", minute: "2-digit", hour12: !clock24 }).format(now).replace(".", ":")}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlarmTab() {
  const alarms = useOS((s) => s.alarms);
  const add = useOS((s) => s.addAlarm);
  const toggle = useOS((s) => s.toggleAlarm);
  const remove = useOS((s) => s.removeAlarm);
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");

  return (
    <div className="clk-pane">
      <div className="clk-add">
        <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <input className="input" placeholder="Label (opsional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button
          className="btn"
          onClick={() => {
            if (!time) return;
            add(time, label.trim());
            setLabel("");
          }}
        >
          <Plus size={15} /> Tambah
        </button>
      </div>
      <p className="muted">Alarm berbunyi setiap hari pada jam yang dipilih selama DapOS terbuka di browser.</p>
      {alarms.length === 0 && <p className="muted">Belum ada alarm.</p>}
      {alarms.map((a) => (
        <div key={a.id} className="clk-alarm">
          <b>{a.time}</b>
          <span>{a.label || "Alarm"}</span>
          <label className="switch">
            <input type="checkbox" checked={a.on} onChange={() => toggle(a.id)} />
            <i />
          </label>
          <button className="icon-btn" aria-label="Hapus alarm" onClick={() => remove(a.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TimerTab() {
  const timer = useOS((s) => s.timer);
  const start = useOS((s) => s.startTimer);
  const pause = useOS((s) => s.pauseTimer);
  const resume = useOS((s) => s.resumeTimer);
  const cancel = useOS((s) => s.cancelTimer);
  const [min, setMin] = useState(5);
  const [sec, setSec] = useState(0);
  const now = useClock(250);

  const running = timer.end !== null;
  const paused = timer.end === null && timer.left !== null;
  const leftMs = running ? Math.max(0, (timer.end as number) - now.getTime()) : paused ? (timer.left as number) : 0;
  const total = Math.ceil(leftMs / 1000);
  const fmt = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  const pct = timer.total > 0 ? Math.max(0, Math.min(100, (leftMs / (timer.total * 1000)) * 100)) : 0;

  return (
    <div className="clk-pane">
      {running || paused ? (
        <>
          <div className="clk-big">{fmt}</div>
          <div className="clk-bar">
            <i style={{ width: pct + "%" }} />
          </div>
          <div className="clk-actions">
            {running ? (
              <button className="btn" onClick={pause}>
                <Pause size={15} /> Jeda
              </button>
            ) : (
              <button className="btn" onClick={resume}>
                <Play size={15} /> Lanjut
              </button>
            )}
            <button className="btn ghost" onClick={cancel}>
              Batal
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="clk-add">
            <label className="clk-num">
              <input className="input" type="number" min={0} max={999} value={min} onChange={(e) => setMin(Math.max(0, Number(e.target.value)))} />
              menit
            </label>
            <label className="clk-num">
              <input className="input" type="number" min={0} max={59} value={sec} onChange={(e) => setSec(Math.max(0, Math.min(59, Number(e.target.value))))} />
              detik
            </label>
            <button className="btn" onClick={() => min * 60 + sec > 0 && start(min * 60 + sec)}>
              <Play size={15} /> Mulai
            </button>
          </div>
          <div className="clk-presets">
            {[1, 5, 10, 25].map((m) => (
              <button key={m} className="chip" onClick={() => start(m * 60)}>
                {m} menit
              </button>
            ))}
          </div>
          <p className="muted">Timer tetap berjalan walaupun jendela Jam ditutup.</p>
        </>
      )}
    </div>
  );
}

function Stopwatch() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const base = useRef(0);
  const elapsed = useRef(ms);

  useEffect(() => {
    elapsed.current = ms;
  }, [ms]);

  useEffect(() => {
    if (!running) return;
    base.current = performance.now() - elapsed.current;
    const t = setInterval(() => setMs(performance.now() - base.current), 33);
    return () => clearInterval(t);
  }, [running]);

  const fmt = (v: number) => {
    const m = Math.floor(v / 60000);
    const s = Math.floor((v % 60000) / 1000);
    const c = Math.floor((v % 1000) / 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
  };

  return (
    <div className="clk-pane">
      <div className="clk-big">{fmt(ms)}</div>
      <div className="clk-actions">
        <button className="btn" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={15} /> : <Play size={15} />} {running ? "Berhenti" : "Mulai"}
        </button>
        <button className="btn ghost" disabled={!running} onClick={() => setLaps((l) => [ms, ...l])}>
          <Flag size={14} /> Putaran
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setRunning(false);
            setMs(0);
            setLaps([]);
          }}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
      <div className="clk-laps">
        {laps.map((l, i) => (
          <div key={i}>
            <span>Putaran {laps.length - i}</span>
            <b>{fmt(l)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Clock() {
  const [tab, setTab] = useState<Tab>("jam");
  const items: [Tab, string][] = [["jam", "Jam"], ["alarm", "Alarm"], ["timer", "Timer"], ["stopwatch", "Stopwatch"]];
  return (
    <div className="games">
      <div className="tabs">
        {items.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "jam" && <World />}
      {tab === "alarm" && <AlarmTab />}
      {tab === "timer" && <TimerTab />}
      {tab === "stopwatch" && <Stopwatch />}
    </div>
  );
}
