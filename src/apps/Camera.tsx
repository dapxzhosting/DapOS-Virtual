import { useEffect, useRef, useState } from "react";
import { Camera as CamIcon, Mic, Square, Trash2, Video as VideoIcon } from "lucide-react";
import { useOS } from "../store/os";
import { childrenOf, isTrashed, useFs } from "../store/fs";
import { isAudio } from "../lib/openFile";
import type { AppProps } from "../types";

const MAX_REC = 120;

function PhotoTab() {
  const touch = useFs((s) => s.touch);
  const notify = useOS((s) => s.notify);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const [last, setLast] = useState("");

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOn(false);
  };
  useEffect(() => stop, []);

  const start = async () => {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 720 } });
      stream.current = s;
      setOn(true);
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      });
    } catch {
      setErr("Kamera tidak bisa diakses. Periksa izin kamera di browser (dan pastikan situs memakai HTTPS).");
    }
  };

  const snap = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const url = c.toDataURL("image/jpeg", 0.8);
    const stamp = new Date().toLocaleString("id-ID").replace(/[/:, ]+/g, "-");
    touch("pictures", `foto-${stamp}.jpg`, url);
    setLast(url);
    notify("Foto tersimpan", "Lihat di folder Gambar atau aplikasi Galeri.");
  };

  return (
    <div className="cam">
      <div className="cam-view">
        {on ? <video ref={video} muted playsInline /> : <p className="muted">Kamera mati.</p>}
        {last && <img className="cam-last" src={last} alt="Foto terakhir" />}
      </div>
      {err && <p className="cam-err">{err}</p>}
      <div className="cam-actions">
        {on ? (
          <>
            <button className="btn" onClick={snap}>
              <CamIcon size={15} /> Ambil foto
            </button>
            <button className="btn ghost" onClick={stop}>
              <Square size={14} /> Matikan kamera
            </button>
          </>
        ) : (
          <button className="btn" onClick={() => void start()}>
            <VideoIcon size={15} /> Nyalakan kamera
          </button>
        )}
      </div>
    </div>
  );
}

function RecordTab() {
  const nodes = useFs((s) => s.nodes);
  const touch = useFs((s) => s.touch);
  const trash = useFs((s) => s.trash);
  const notify = useOS((s) => s.notify);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState("");

  const recordings = childrenOf(nodes, "music").filter((n) => n.type === "file" && isAudio(n) && !isTrashed(nodes, n.id));

  useEffect(() => {
    return () => {
      if (rec.current && rec.current.state !== "inactive") rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (recording && secs >= MAX_REC && rec.current) rec.current.stop();
  }, [recording, secs]);

  const start = async () => {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = new MediaRecorder(s);
      rec.current = r;
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        s.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const ext = (r.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm";
          const stamp = new Date().toLocaleString("id-ID").replace(/[/:, ]+/g, "-");
          touch("music", `rekaman-${stamp}.${ext}`, String(reader.result));
          notify("Rekaman tersimpan", "Disimpan di folder Musik.");
        };
        reader.readAsDataURL(blob);
      };
      setSecs(0);
      r.start();
      setRecording(true);
    } catch {
      setErr("Mikrofon tidak bisa diakses. Periksa izin mikrofon di browser (dan pastikan situs memakai HTTPS).");
    }
  };

  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

  return (
    <div className="rec">
      <div className="rec-top">
        {recording ? (
          <button className="btn danger" onClick={() => rec.current?.stop()}>
            <Square size={14} /> Berhenti · {fmt(secs)}
          </button>
        ) : (
          <button className="btn" onClick={() => void start()}>
            <Mic size={15} /> Mulai merekam
          </button>
        )}
        <small className="muted">Maksimal {MAX_REC / 60} menit per rekaman.</small>
      </div>
      {err && <p className="cam-err">{err}</p>}
      <div className="rec-list">
        {recordings.length === 0 && <p className="muted">Belum ada rekaman.</p>}
        {recordings.map((n) => (
          <div key={n.id} className="rec-item">
            <span>{n.name}</span>
            <audio controls src={n.content} />
            <button className="icon-btn" aria-label="Hapus rekaman" onClick={() => trash(n.id)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Camera({ win }: AppProps) {
  const [tab, setTab] = useState<"foto" | "rekam">(win.payload?.tab === "rekam" ? "rekam" : "foto");
  return (
    <div className="games">
      <div className="tabs">
        <button className={tab === "foto" ? "on" : ""} onClick={() => setTab("foto")}>Kamera</button>
        <button className={tab === "rekam" ? "on" : ""} onClick={() => setTab("rekam")}>Perekam suara</button>
      </div>
      {tab === "foto" ? <PhotoTab /> : <RecordTab />}
    </div>
  );
}
