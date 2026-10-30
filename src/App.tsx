import { useEffect } from "react";
import { useOS } from "./store/os";
import { onAccent } from "./lib/color";
import { playTone } from "./lib/sound";
import { cloudErrorMessage, cloudHasData, cloudPull, cloudPush, cloudStatus, isFirebaseConfigured, startCloudAutoSync, stopCloudAutoSync } from "./lib/cloud";
import { useIsMobile } from "./lib/useIsMobile";
import Boot from "./components/Boot";
import Lock from "./components/Lock";
import Login from "./components/Login";
import Off from "./components/Off";
import Desktop from "./components/Desktop";
import MobileShell from "./components/MobileShell";

export default function App() {
  const phase = useOS((s) => s.phase);
  const theme = useOS((s) => s.theme);
  const accent = useOS((s) => s.accent);
  const tbPos = useOS((s) => s.tbPos);
  const tbAlign = useOS((s) => s.tbAlign);
  const mobile = useIsMobile();

  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = theme;
    r.dataset.tb = tbPos;
    r.dataset.align = tbAlign;
    r.style.setProperty("--accent", accent);
    r.style.setProperty("--on-accent", onAccent(accent));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#12151f" : "#f6f7fb");
  }, [theme, accent, tbPos, tbAlign]);

  useEffect(() => {
    if (phase === "login" && useOS.getState().sounds) playTone("startup");
  }, [phase]);

  useEffect(() => {
    let active = true;
    const initializeCloudSync = async (prepare: boolean) => {
      if (!isFirebaseConfigured()) {
        stopCloudAutoSync();
        return;
      }
      try {
        const account = await cloudStatus();
        if (!active) return;
        if (!account) {
          stopCloudAutoSync();
          return;
        }
        if (prepare) {
          if (await cloudHasData()) {
            const restore = window.confirm(
              "Cadangan cloud ditemukan. Pilih OK untuk memulihkan data cloud ke perangkat ini, atau Batal untuk menyimpan data perangkat ini ke cloud."
            );
            if (!active) return;
            if (restore) await cloudPull();
            else await cloudPush();
          } else {
            await cloudPush();
          }
        }
        if (!active) return;
        startCloudAutoSync((message) => useOS.getState().notify("Sinkronisasi cloud gagal", message));
      } catch (error) {
        if (active) {
          useOS.getState().notify("Sinkronisasi cloud gagal", cloudErrorMessage(error));
        }
      }
    };
    const onCloudAuthChange = () => void initializeCloudSync(false);
    window.addEventListener("dapos-cloud-auth", onCloudAuthChange);
    void initializeCloudSync(true);
    return () => {
      active = false;
      window.removeEventListener("dapos-cloud-auth", onCloudAuthChange);
      stopCloudAutoSync();
    };
  }, []);

  const showShell = phase === "desktop" || phase === "lock" || phase === "login";

  return (
    <>
      {showShell && (mobile ? <MobileShell /> : <Desktop />)}
      {phase === "lock" && <Lock />}
      {phase === "login" && <Login />}
      {phase === "boot" && <Boot />}
      {phase === "off" && <Off />}
    </>
  );
}
