import { useState } from "react";
import { motion } from "framer-motion";
import { useOS } from "../store/os";
import { hashPin } from "../lib/pin";
import { playTone } from "../lib/sound";
import { cloudErrorMessage, cloudHasData, cloudPull, cloudPush, cloudSignIn, isFirebaseConfigured } from "../lib/cloud";

export default function Login() {
  const setPhase = useOS((s) => s.setPhase);
  const notify = useOS((s) => s.notify);
  const userName = useOS((s) => s.userName);
  const wallpaper = useOS((s) => s.wallpaper);
  const pinHash = useOS((s) => s.pinHash);
  const sounds = useOS((s) => s.sounds);
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firebaseReady = isFirebaseConfigured();

  const enter = () => {
    setPhase("desktop");
    notify("Selamat datang di DapOS", `Halo, ${userName}. Tekan Alt+S untuk membuka menu Mulai.`);
  };

  const submit = async () => {
    if (!pinHash) return enter();
    if ((await hashPin(pin)) === pinHash) return enter();
    if (sounds) playTone("error");
    setWrong(true);
    setPin("");
    setTimeout(() => setWrong(false), 600);
  };

  const loginCloud = async (create: boolean) => {
    setBusy(true);
    setError("");
    try {
      const account = await cloudSignIn(email.trim(), password, create);
      let syncError = "";
      try {
        if (create || !(await cloudHasData())) {
          await cloudPush();
        } else if (window.confirm("Cadangan cloud ditemukan. Pilih OK untuk memulihkan data cloud ke perangkat ini, atau Batal untuk menyimpan data perangkat ini ke cloud.")) {
          await cloudPull();
        } else {
          await cloudPush();
        }
        window.dispatchEvent(new Event("dapos-cloud-auth"));
      } catch (error) {
        syncError = cloudErrorMessage(error);
      }
      setPhase("desktop");
      if (syncError) {
        notify("Login berhasil, sinkronisasi gagal", syncError);
      } else {
        notify("Login berhasil", `Masuk sebagai ${account}. Sinkronisasi data otomatis aktif.`);
      }
    } catch (e) {
      setError(cloudErrorMessage(e));
      if (sounds) playTone("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="lock-bg" style={{ background: wallpaper }} />
      <div className="login-card">
        <span className="avatar">{userName.slice(0, 1).toUpperCase()}</span>
        <div className="login-name">Masuk ke DapOS</div>
        <p className="muted login-description">Gunakan akun cloud untuk memuat dan menyimpan data di berbagai perangkat.</p>
        <div className="login-cloud">
          {firebaseReady ? (
            <>
              <input
                className="input login-field"
                type="email"
                autoComplete="email"
                placeholder="Email akun"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                className="input login-field"
                type="password"
                autoComplete="current-password"
                placeholder="Kata sandi"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void loginCloud(false)}
              />
              <div className="login-actions">
                <button className="btn" disabled={busy || !email.trim() || !password} onClick={() => void loginCloud(false)}>
                  {busy ? "Memproses..." : "Masuk dengan akun"}
                </button>
                <button className="btn ghost" disabled={busy || !email.trim() || password.length < 6} onClick={() => void loginCloud(true)}>
                  Buat akun
                </button>
              </div>
            </>
          ) : (
            <p className="muted login-config-message">
              Login cloud belum dikonfigurasi. Admin aplikasi perlu mengatur Firebase project pada environment deployment.
            </p>
          )}
          {error && <small className="login-err">{error}</small>}
        </div>
        <div className="login-divider"><span>atau masuk lokal</span></div>
        {pinHash ? (
          <div className="login-local">
            <input
              className={"input login-pin" + (wrong ? " shake" : "")}
              type="password"
              autoComplete="current-password"
              placeholder="PIN lokal"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
            {wrong && <small className="login-err">Salah. Coba lagi.</small>}
            <button className="btn" onClick={() => void submit()}>
              Masuk lokal
            </button>
          </div>
        ) : (
          <button className="btn ghost" onClick={enter}>
            Lanjutkan tanpa akun
          </button>
        )}
        <button className="link" onClick={() => setPhase("lock")}>
          Kembali ke layar kunci
        </button>
      </div>
    </motion.div>
  );
}
