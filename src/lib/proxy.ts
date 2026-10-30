import { useEffect, useState } from "react";

export function proxyBase(): string {
  const env = (import.meta.env as Record<string, string | undefined>)["VITE_PROXY_URL"];
  if (env) return env.replace(/\/$/, "");
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" ? `${window.location.protocol}//${h}:8787` : "";
}

export const proxied = (url: string) => `${proxyBase()}/proxy?url=${encodeURIComponent(url)}`;

export function useProxyStatus() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2500);
    fetch(`${proxyBase()}/proxy/health`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((j: { ok?: boolean }) => alive && setOk(j.ok === true))
      .catch(() => alive && setOk(false))
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      ctl.abort();
      clearTimeout(timer);
    };
  }, [n]);

  return {
    ok,
    recheck: () => {
      setOk(null);
      setN((v) => v + 1);
    },
  };
}
