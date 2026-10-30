import { useEffect } from "react";
import { motion } from "framer-motion";
import { useOS } from "../store/os";
import Logo from "./Logo";

export default function Boot() {
  const setPhase = useOS((s) => s.setPhase);
  useEffect(() => {
    const t = setTimeout(() => setPhase("lock"), 2600);
    return () => clearTimeout(t);
  }, [setPhase]);

  return (
    <div className="boot">
      <motion.div
        className="boot-mark"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Logo size={92} />
      </motion.div>
      <motion.div className="boot-name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        DapOS
      </motion.div>
      <div className="boot-bar">
        <motion.i initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2.3, ease: "easeInOut" }} />
      </div>
      <div className="boot-msg">Menyiapkan desktop…</div>
    </div>
  );
}
