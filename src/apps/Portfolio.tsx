import { useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";

const URL_PORTFOLIO = "https://dafaalfiansyah.my.id";

export default function Portfolio() {
  const [nonce, setNonce] = useState(0);
  return (
    <div className="br">
      <div className="br-bar">
        <button className="icon-btn" aria-label="Muat ulang" onClick={() => setNonce(nonce + 1)}>
          <RotateCw size={15} />
        </button>
        <span className="input br-url pf-url">{URL_PORTFOLIO.replace("https://", "")}</span>
        <a className="btn" href={URL_PORTFOLIO} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> Buka di tab baru
        </a>
      </div>
      <div className="br-hint">
        Kalau halaman tampil kosong, situsnya menolak dimuat di dalam jendela. Pakai tombol “Buka di tab baru”.
      </div>
      <iframe
        key={nonce}
        className="br-frame"
        src={URL_PORTFOLIO}
        title="Portofolio"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
