import { Power } from "lucide-react";
import { useOS } from "../store/os";

export default function Off() {
  const setPhase = useOS((s) => s.setPhase);
  return (
    <div className="off">
      <button onClick={() => setPhase("boot")} aria-label="Nyalakan DapOS">
        <Power size={30} />
      </button>
      <span>Klik untuk menyalakan DapOS</span>
    </div>
  );
}
