import { useEffect, useState } from "react";
import { useOS } from "../store/os";

export function useIsMobile(): boolean {
  const mode = useOS((s) => s.uiMode);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 720);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth <= 720);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return mode === "mobile" || (mode === "auto" && narrow);
}
