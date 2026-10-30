import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Home, Plus, RotateCw, Search, ShieldAlert, ShieldCheck, Star, X } from "lucide-react";
import { useOS } from "../store/os";
import { proxied, useProxyStatus } from "../lib/proxy";
import type { AppProps, SearchEngine } from "../types";

const engines: Record<SearchEngine, { name: string; url: string }> = {
  ddg: { name: "DuckDuckGo", url: "https://html.duckduckgo.com/html/?q=" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=" },
  wiki: { name: "Wikipedia", url: "https://id.wikipedia.org/w/index.php?search=" },
};

interface Tab {
  id: number;
  title: string;
  history: string[];
  idx: number;
  frameSrc: string;
  reload: number;
  loading: boolean;
  pending: boolean;
}

const MAX_TABS = 8;
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
const blank = (id: number): Tab => ({ id, title: "Tab baru", history: [""], idx: 0, frameSrc: "", reload: 0, loading: false, pending: false });

function normalize(raw: string, engine: SearchEngine): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (!/\s/.test(v) && (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#].*)?$/.test(v) || /^localhost(:\d+)?([/?#].*)?$/.test(v))) {
    return (v.startsWith("localhost") ? "http://" : "https://") + v;
  }
  return engines[engine].url + encodeURIComponent(v);
}

export default function Browser({ win }: AppProps) {
  const engine = useOS((s) => s.searchEngine);
  const setEngine = useOS((s) => s.setSearchEngine);
  const bookmarks = useOS((s) => s.bookmarks);
  const addBookmark = useOS((s) => s.addBookmark);
  const removeBookmark = useOS((s) => s.removeBookmark);
  const setTitle = useOS((s) => s.setTitle);
  const status = useProxyStatus();
  const okRef = useRef<boolean | null>(null);
  okRef.current = status.ok;

  const [tabs, setTabs] = useState<Tab[]>([blank(1)]);
  const [active, setActive] = useState(1);
  const [input, setInput] = useState("");
  const [home, setHome] = useState("");
  const idc = useRef(2);
  const frames = useRef<Record<number, HTMLIFrameElement | null>>({});

  const cur = tabs.find((t) => t.id === active) ?? (tabs[0] as Tab);
  const url = cur.history[cur.idx] ?? "";
  const srcFor = (u: string) => (!u ? "" : okRef.current === false ? u : proxied(u));
  const marked = !!url && bookmarks.some((b) => b.url === url);

  useEffect(() => setInput(url), [url, cur.id]);
  useEffect(() => {
    setTitle(win.id, `${cur.title || "Peramban"} – Peramban`);
  }, [win.id, cur.title, setTitle]);

  const patch = (id: number, fn: (t: Tab) => Tab) => setTabs((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  const openTab = (u = "") => {
    if (tabs.length >= MAX_TABS) return;
    const id = idc.current++;
    const t: Tab = u
      ? { ...blank(id), title: hostOf(u), history: [u], frameSrc: srcFor(u), loading: true, pending: true }
      : blank(id);
    setTabs((ts) => (ts.length >= MAX_TABS ? ts : [...ts, t]));
    setActive(id);
  };

  const closeTab = (id: number) => {
    if (tabs.length === 1) {
      setTabs([blank(idc.current++)]);
      setActive(idc.current - 1);
      return;
    }
    const i = tabs.findIndex((t) => t.id === id);
    const rest = tabs.filter((t) => t.id !== id);
    delete frames.current[id];
    setTabs(rest);
    if (id === active) setActive((rest[Math.max(0, i - 1)] as Tab).id);
  };

  const go = (raw: string, id = active) => {
    const u = normalize(raw, engine);
    patch(id, (t) => ({
      ...t,
      history: [...t.history.slice(0, t.idx + 1), u],
      idx: t.idx + 1,
      frameSrc: srcFor(u),
      reload: t.reload + 1,
      loading: !!u,
      pending: !!u,
      title: u ? hostOf(u) : "Tab baru",
    }));
  };

  const step = (d: number) =>
    patch(active, (t) => {
      const i = t.idx + d;
      if (i < 0 || i >= t.history.length) return t;
      const u = t.history[i] ?? "";
      return { ...t, idx: i, frameSrc: srcFor(u), reload: t.reload + 1, loading: !!u, pending: !!u, title: u ? hostOf(u) : "Tab baru" };
    });

  const reload = () => patch(active, (t) => ({ ...t, reload: t.reload + 1, loading: !!t.history[t.idx], pending: !!t.history[t.idx] }));

  const openDirectly = () => {
    if (!url) return;
    if (window.dapos) {
      void window.dapos.openSite(url).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
        window.alert(`Tidak bisa membuka situs: ${message}`);
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    const on = (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string; title?: string } | null;
      if (!d || typeof d !== "object" || typeof d.url !== "string") return;
      const tabId = Number(Object.keys(frames.current).find((k) => frames.current[Number(k)]?.contentWindow === e.source));
      if (!tabId) return;
      const nextUrl = d.url;
      if (!/^https?:\/\//i.test(nextUrl)) return;
      if (d.type === "dapos-open") {
        const id = idc.current++;
        setTabs((ts) =>
          ts.length >= MAX_TABS
            ? ts
            : [...ts, { ...blank(id), title: hostOf(nextUrl), history: [nextUrl], frameSrc: srcFor(nextUrl), loading: true, pending: true }]
        );
        setActive(id);
      } else if (d.type === "dapos-nav") {
        const title = (d.title || "").trim() || hostOf(nextUrl);
        patch(tabId, (t) => {
          const here = t.history[t.idx] ?? "";
          if (t.pending) {
            return { ...t, history: t.history.map((h, i) => (i === t.idx ? nextUrl : h)), pending: false, loading: false, title };
          }
          if (nextUrl !== here) {
            return { ...t, history: [...t.history.slice(0, t.idx + 1), nextUrl], idx: t.idx + 1, loading: false, title };
          }
          return { ...t, loading: false, title };
        });
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  return (
    <div className="br">
      <div className="br-tabs">
        {tabs.map((t) => (
          <div key={t.id} className={"br-tab" + (t.id === active ? " on" : "")} onClick={() => setActive(t.id)}>
            <span>{t.loading ? "Memuat…" : t.title}</span>
            <button
              aria-label="Tutup tab"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button className="icon-btn" aria-label="Tab baru" disabled={tabs.length >= MAX_TABS} onClick={() => openTab()}>
          <Plus size={16} />
        </button>
      </div>

      <div className="br-bar">
        <button className="icon-btn" aria-label="Kembali" disabled={cur.idx === 0} onClick={() => step(-1)}>
          <ArrowLeft size={16} />
        </button>
        <button className="icon-btn" aria-label="Maju" disabled={cur.idx >= cur.history.length - 1} onClick={() => step(1)}>
          <ArrowRight size={16} />
        </button>
        <button className="icon-btn" aria-label="Muat ulang" disabled={!url} onClick={reload}>
          <RotateCw size={15} />
        </button>
        <button className="icon-btn" aria-label="Beranda" onClick={() => go("")}>
          <Home size={16} />
        </button>
        {status.ok === false ? (
          <button className="icon-btn warn" aria-label="Proxy mati, klik untuk cek ulang" title="Server proxy tidak terhubung. Klik untuk cek ulang." onClick={status.recheck}>
            <ShieldAlert size={16} />
          </button>
        ) : (
          <span className={"icon-btn" + (status.ok ? " good" : "")} title={status.ok ? "Proxy aktif: situs yang menolak iframe tetap bisa dibuka" : "Memeriksa proxy…"}>
            <ShieldCheck size={16} />
          </span>
        )}
        <input
          className="input br-url"
          value={input}
          placeholder="Cari atau ketik alamat"
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go(input)}
        />
        <button
          className={"icon-btn" + (marked ? " on" : "")}
          aria-label="Bookmark"
          disabled={!url}
          onClick={() => (marked ? removeBookmark(url) : addBookmark({ title: cur.title, url }))}
        >
          <Star size={16} fill={marked ? "currentColor" : "none"} />
        </button>
        <button className="icon-btn" aria-label="Buka langsung di jendela browser" title="Buka langsung di jendela browser dengan sesi tersimpan" disabled={!url} onClick={openDirectly}>
          <ExternalLink size={15} />
        </button>
      </div>

      {bookmarks.length > 0 && (
        <div className="br-marks">
          {bookmarks.map((b) => (
            <span key={b.url} className="br-mark">
              <button title={b.url} onClick={() => go(b.url)}>
                {b.title}
              </button>
              <button aria-label={`Hapus bookmark ${b.title}`} className="x" onClick={() => removeBookmark(b.url)}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {cur.loading && <div className="br-load" />}
      {status.ok === false && (
        <div className="br-hint warn">
          Server proxy belum jalan, jadi situs besar yang menolak iframe tidak akan tampil. Jalankan <code>npm run proxy</code> di
          terminal lain (lihat README), lalu klik ikon perisai.
        </div>
      )}

      <div className="br-stage">
        {tabs.map((t) => (
          <div key={t.id} className="br-page" style={{ display: t.id === active ? "flex" : "none" }}>
            {t.frameSrc ? (
              <iframe
                key={`${t.id}-${t.reload}`}
                ref={(el) => {
                  frames.current[t.id] = el;
                }}
                className="br-frame"
                src={t.frameSrc}
                title={t.title}
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
                onLoad={() => patch(t.id, (x) => (x.loading ? { ...x, loading: false } : x))}
              />
            ) : (
              <div className="br-home">
                <h2>Peramban DapOS</h2>
                <form
                  className="br-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    go(home, t.id);
                    setHome("");
                  }}
                >
                  <Search size={16} />
                  <input autoFocus placeholder={`Cari dengan ${engines[engine].name} atau ketik alamat`} value={home} onChange={(e) => setHome(e.target.value)} />
                </form>
                <div className="br-engines">
                  {(Object.keys(engines) as SearchEngine[]).map((k) => (
                    <button key={k} className={"chip" + (engine === k ? " on" : "")} onClick={() => setEngine(k)}>
                      {engines[k].name}
                    </button>
                  ))}
                </div>
                <div className="br-quick">
                  {bookmarks.slice(0, 8).map((b) => (
                    <button key={b.url} onClick={() => go(b.url, t.id)}>
                      {b.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
