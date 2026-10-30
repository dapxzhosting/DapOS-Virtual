import { useEffect, useState } from "react";
import { Cloud, Info, Lock, Monitor, Palette, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOS } from "../store/os";
import { liveFiles, useFs } from "../store/fs";
import { wallpapers } from "../lib/wallpapers";
import { accents } from "../components/QuickPanel";
import { hashPin } from "../lib/pin";
import { cloudErrorMessage, cloudHasData, cloudPull, cloudPush, cloudSignIn, cloudSignOut, cloudStatus, isFirebaseConfigured } from "../lib/cloud";
import type { IconSize, TbAlign, TbPos, UiMode } from "../types";

type Tab = "personal" | "display" | "system" | "security" | "cloud" | "about";
const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "personal", label: "Personalisasi", icon: Palette },
  { id: "display", label: "Tampilan", icon: Monitor },
  { id: "system", label: "Sistem", icon: SlidersHorizontal },
  { id: "security", label: "Keamanan", icon: Lock },
  { id: "cloud", label: "Cloud", icon: Cloud },
  { id: "about", label: "Tentang", icon: Info },
];

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="chips">
      {options.map(([v, label]) => (
        <button key={v} className={"chip" + (value === v ? " on" : "")} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Security() {
  const pinHash = useOS((s) => s.pinHash);
  const setPinHash = useOS((s) => s.setPinHash);
  const notify = useOS((s) => s.notify);
  const [cur, setCur] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const save = async () => {
    if (a.length < 4) return notify("Keamanan", "PIN atau kata sandi minimal 4 karakter.");
    if (a !== b) return notify("Keamanan", "Konfirmasi tidak sama.");
    if (pinHash && (await hashPin(cur)) !== pinHash) return notify("Keamanan", "PIN saat ini salah.");
    setPinHash(await hashPin(a));
    setCur("");
    setA("");
    setB("");
    notify("Keamanan", "PIN login disimpan.");
  };
  const remove = async () => {
    if (!pinHash) return;
    if ((await hashPin(cur)) !== pinHash) return notify("Keamanan", "PIN saat ini salah.");
    setPinHash(null);
    setCur("");
    notify("Keamanan", "PIN login dihapus.");
  };

  return (
    <>
      <h3>PIN login</h3>
      <p className="muted">
        {pinHash ? "PIN login aktif." : "Belum ada PIN. Layar login akan langsung masuk."} PIN disimpan di browser ini dan
        hanya menghalangi orang yang membuka DapOS, bukan pengaman data yang sebenarnya.
      </p>
      <div className="set-col">
        {pinHash && <input className="input" type="password" placeholder="PIN saat ini" value={cur} onChange={(e) => setCur(e.target.value)} />}
        <input className="input" type="password" placeholder="PIN baru (min. 4 karakter)" value={a} onChange={(e) => setA(e.target.value)} />
        <input className="input" type="password" placeholder="Ulangi PIN baru" value={b} onChange={(e) => setB(e.target.value)} />
        <div className="chips">
          <button className="btn" onClick={() => void save()}>
            {pinHash ? "Ganti PIN" : "Pasang PIN"}
          </button>
          {pinHash && (
            <button className="btn ghost" onClick={() => void remove()}>
              Hapus PIN
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function CloudTab() {
  const notify = useOS((s) => s.notify);
  const firebaseReady = isFirebaseConfigured();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!firebaseReady) return;
    let alive = true;
    cloudStatus()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, [firebaseReady]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg("");
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg("Gagal: " + cloudErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h3>Sinkronisasi Firebase</h3>
      <p className="muted">
        Simpan file dan pengaturan ke Firestore proyek DapOS. Pengguna hanya perlu masuk menggunakan akun; konfigurasi proyek
        dikelola oleh admin aplikasi.
      </p>
      {!firebaseReady ? (
        <p className="set-msg">Login cloud belum tersedia. Admin perlu mengatur environment Firebase saat menjalankan atau membangun aplikasi.</p>
      ) : (
        <>
          {user ? (
            <div className="set-col">
              <p>
                Masuk sebagai <b>{user}</b>
              </p>
              <div className="chips">
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const n = await cloudPush();
                      window.dispatchEvent(new Event("dapos-cloud-auth"));
                      notify("Cloud", "Data diunggah ke cloud.");
                      return `Berhasil mengunggah ${Math.round(n / 1024)} KB.`;
                    })
                  }
                >
                  Unggah ke cloud
                </button>
                <button
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm("Data di perangkat ini akan diganti dengan data dari cloud. Lanjutkan?")) return;
                    void run(async () => {
                      const at = await cloudPull();
                      if (at === null) return "Belum ada data di cloud untuk akun ini.";
                      window.dispatchEvent(new Event("dapos-cloud-auth"));
                      notify("Cloud", "Data diunduh dari cloud.");
                      return `Berhasil mengunduh data (disimpan ${new Date(at).toLocaleString("id-ID")}).`;
                    });
                  }}
                >
                  Unduh dari cloud
                </button>
                <button
                  className="btn ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await cloudSignOut();
                      setUser(null);
                      window.dispatchEvent(new Event("dapos-cloud-auth"));
                      return "Keluar dari akun cloud.";
                    })
                  }
                >
                  Keluar
                </button>
              </div>
            </div>
          ) : (
            <div className="set-col">
              <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" type="password" placeholder="Kata sandi (min. 6 karakter)" value={pw} onChange={(e) => setPw(e.target.value)} />
              <div className="chips">
                <button className="btn" disabled={busy} onClick={() => void run(async () => {
                  const u = await cloudSignIn(email, pw, false);
                  setUser(u);
                  if (await cloudHasData()) {
                    if (window.confirm("Cadangan cloud ditemukan. Pilih OK untuk memulihkan data cloud ke perangkat ini, atau Batal untuk menyimpan data perangkat ini ke cloud.")) {
                      await cloudPull();
                    } else {
                      await cloudPush();
                    }
                  } else {
                    await cloudPush();
                  }
                  window.dispatchEvent(new Event("dapos-cloud-auth"));
                  return "Berhasil masuk. Sinkronisasi otomatis aktif.";
                })}>
                  Masuk
                </button>
                <button className="btn ghost" disabled={busy} onClick={() => void run(async () => {
                  const u = await cloudSignIn(email, pw, true);
                  setUser(u);
                  await cloudPush();
                  window.dispatchEvent(new Event("dapos-cloud-auth"));
                  return "Akun dibuat dan data lokal dicadangkan. Sinkronisasi otomatis aktif.";
                })}>
                  Daftar akun baru
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {msg && <p className="set-msg">{msg}</p>}
    </>
  );
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>("personal");
  const os = useOS();
  const fileCount = useFs((s) => liveFiles(s.nodes).length);
  const [url, setUrl] = useState("");
  const [name, setName] = useState(os.userName);

  const applyUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return os.notify("Wallpaper", "Masukkan alamat gambar yang diawali http:// atau https://");
    os.setWallpaper(`url("${u.replace(/"/g, "%22")}") center / cover no-repeat`);
  };
  const resetAll = () => {
    if (!window.confirm("Hapus semua file dan pengaturan DapOS di browser ini?")) return;
    localStorage.removeItem("dapos-fs");
    localStorage.removeItem("dapos-os");
    window.location.reload();
  };

  return (
    <div className="set">
      <nav className="set-nav">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </nav>

      <div className="set-main">
        {tab === "personal" && (
          <>
            <h3>Wallpaper</h3>
            <div className="wp-grid">
              {wallpapers.map((w) => (
                <button
                  key={w.name}
                  className={"wp" + (os.wallpaper === w.css ? " on" : "")}
                  style={{ background: w.css }}
                  onClick={() => os.setWallpaper(w.css)}
                  aria-label={`Wallpaper ${w.name}`}
                >
                  <span>{w.name}</span>
                </button>
              ))}
            </div>
            <div className="set-row">
              <input className="input" placeholder="Atau tempel alamat gambar (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyUrl()} />
              <button className="btn" onClick={applyUrl}>Terapkan</button>
            </div>
            <p className="muted">Tip: di Galeri kamu bisa menjadikan gambar mana pun sebagai wallpaper.</p>

            <h3>Tema</h3>
            <Seg value={os.theme} onChange={os.setTheme} options={[["dark", "Gelap"], ["light", "Terang"]]} />

            <h3>Warna aksen</h3>
            <div className="swatches big">
              {accents.map((c) => (
                <button key={c} aria-label={`Aksen ${c}`} className={"swatch" + (c === os.accent ? " on" : "")} style={{ background: c }} onClick={() => os.setAccent(c)} />
              ))}
              <input type="color" aria-label="Warna aksen kustom" value={os.accent} onChange={(e) => os.setAccent(e.target.value)} />
            </div>
          </>
        )}

        {tab === "display" && (
          <>
            <h3>Ukuran ikon desktop</h3>
            <Seg<IconSize> value={os.iconSize} onChange={os.setIconSize} options={[["sm", "Kecil"], ["md", "Sedang"], ["lg", "Besar"]]} />
            <h3>Posisi taskbar</h3>
            <Seg<TbPos> value={os.tbPos} onChange={os.setTbPos} options={[["bottom", "Bawah"], ["top", "Atas"]]} />
            <h3>Perataan taskbar</h3>
            <Seg<TbAlign> value={os.tbAlign} onChange={os.setTbAlign} options={[["center", "Tengah"], ["left", "Kiri"]]} />
            <h3>Mode tampilan</h3>
            <Seg<UiMode> value={os.uiMode} onChange={os.setUiMode} options={[["auto", "Otomatis"], ["desktop", "Desktop"], ["mobile", "Mobile"]]} />
            <p className="muted">Otomatis memakai tampilan mobile ala Android saat layar sempit (di bawah 720 px).</p>
            <h3>Kecerahan layar</h3>
            <input type="range" min={40} max={100} value={os.brightness} onChange={(e) => os.setBrightness(Number(e.target.value))} />
          </>
        )}

        {tab === "system" && (
          <>
            <h3>Nama pengguna</h3>
            <div className="set-row">
              <input className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
              <button className="btn" onClick={() => os.setUserName(name.trim() || "Dap")}>Simpan</button>
            </div>
            <h3>Suara sistem</h3>
            <Seg<"on" | "off"> value={os.sounds ? "on" : "off"} onChange={(v) => os.setSounds(v === "on")} options={[["on", "Hidup"], ["off", "Mati"]]} />
            <h3>Format jam</h3>
            <Seg<"24" | "12"> value={os.clock24 ? "24" : "12"} onChange={(v) => os.setClock24(v === "24")} options={[["24", "24 jam"], ["12", "12 jam"]]} />
            <h3>Data</h3>
            <p className="muted">{fileCount} file tersimpan di browser ini. Mengatur ulang akan mengembalikan DapOS ke kondisi awal.</p>
            <button className="btn danger" onClick={resetAll}>Atur ulang DapOS</button>
          </>
        )}

        {tab === "security" && <Security />}
        {tab === "cloud" && <CloudTab />}

        {tab === "about" && (
          <>
            <h3>DapOS 2.0</h3>
            <p className="muted">Sistem operasi web buatan sendiri, dibangun dengan React, TypeScript, Zustand, dan Framer Motion.</p>
            <table className="about">
              <tbody>
                <tr><td>Jendela terbuka</td><td>{os.windows.length}</td></tr>
                <tr><td>Desktop virtual</td><td>{os.desks}</td></tr>
                <tr><td>Aplikasi terpasang</td><td>{os.installed.length}</td></tr>
                <tr><td>File tersimpan</td><td>{fileCount}</td></tr>
                <tr><td>Layar</td><td>{window.innerWidth} × {window.innerHeight}</td></tr>
              </tbody>
            </table>
            <h3>Pintasan keyboard</h3>
            <table className="about">
              <tbody>
                <tr><td>Alt + S</td><td>Menu Mulai</td></tr>
                <tr><td>Alt + T / E</td><td>Terminal / Penjelajah File</td></tr>
                <tr><td>Alt + V</td><td>Task View</td></tr>
                <tr><td>Alt + 1…4</td><td>Pindah desktop virtual</td></tr>
                <tr><td>Alt + Q (tahan Alt)</td><td>Pindah antar jendela</td></tr>
                <tr><td>Alt + ← / → / ↑ / ↓</td><td>Snap kiri / kanan / maksimal / kembalikan</td></tr>
                <tr><td>Alt + D</td><td>Tampilkan desktop</td></tr>
                <tr><td>Alt + W</td><td>Tutup jendela aktif</td></tr>
                <tr><td>Alt + L</td><td>Kunci layar</td></tr>
                <tr><td>Ctrl + C / X / V</td><td>Salin / potong / tempel file</td></tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
