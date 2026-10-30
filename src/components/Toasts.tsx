import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOS } from "../store/os";
import type { Notice } from "../types";

function Toast({ n }: { n: Notice }) {
  const dismiss = useOS((s) => s.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(n.id), 4500);
    return () => clearTimeout(t);
  }, [n.id, dismiss]);
  return (
    <motion.div
      className="toast"
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.18 }}
      onClick={() => dismiss(n.id)}
    >
      <b>{n.title}</b>
      <span>{n.body}</span>
    </motion.div>
  );
}

export default function Toasts() {
  const toasts = useOS((s) => s.toasts);
  return (
    <div className="toasts">
      <AnimatePresence>
        {toasts.map((n) => (
          <Toast key={n.id} n={n} />
        ))}
      </AnimatePresence>
    </div>
  );
}
