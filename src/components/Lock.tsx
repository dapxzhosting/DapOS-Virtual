import { useEffect } from "react";
import { motion } from "framer-motion";
import { useOS } from "../store/os";
import { useClock } from "../lib/useClock";

export default function Lock() {
  const setPhase = useOS((s) => s.setPhase);
  const wallpaper = useOS((s) => s.wallpaper);
  const now = useClock(1000);

  useEffect(() => {
    const go = () => setPhase("login");
    window.addEventListener("keydown", go);
    return () => window.removeEventListener("keydown", go);
  }, [setPhase]);

  return (
    <motion.div
      className="lock"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      onClick={() => setPhase("login")}
    >
      <div className="lock-bg" style={{ background: wallpaper }} />
      <div className="lock-time">{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":")}</div>
      <div className="lock-date">
        {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
      </div>
      <div className="lock-hint">Klik atau tekan tombol apa saja untuk masuk</div>
    </motion.div>
  );
}
