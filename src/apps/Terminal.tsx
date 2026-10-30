import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as RKeyboardEvent } from "react";
import { useOS } from "../store/os";
import { ROOT, TRASH, childrenOf, isProtected, pathOf, resolvePath, useFs } from "../store/fs";
import { appIds, appMeta } from "../appMeta";
import type { AppProps } from "../types";

interface Line {
  id: number;
  kind: "in" | "out" | "err" | "sys";
  text: string;
}

const tokenize = (s: string) => Array.from(s.matchAll(/"([^"]*)"|(\S+)/g), (m) => m[1] ?? m[2] ?? "");

const BANNER = ["╔╦╗╔═╗╔═╗╔═╗╔═╗", " ║║╠═╣╠═╝║ ║╚═╗", "═╩╝╩ ╩╩  ╚═╝╚═╝"];

export default function Terminal({ win }: AppProps) {
  const nodes = useFs((s) => s.nodes);
  const userName = useOS((s) => s.userName);
  const [lines, setLines] = useState<Line[]>([
    { id: 0, kind: "sys", text: "DapOS Terminal 1.0 · ketik 'help' untuk daftar perintah." },
  ]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState(ROOT);
  const hist = useRef<string[]>([]);
  const hi = useRef(0);
  const idc = useRef(1);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const host = userName.toLowerCase().replace(/\s+/g, "") || "user";
  const prompt = `${host}@dapos:${pathOf(nodes, nodes[cwd] ? cwd : ROOT)}$`;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const run = (raw: string) => {
    const fs = useFs.getState();
    const os = useOS.getState();
    const res: Omit<Line, "id">[] = [{ kind: "in", text: `${prompt} ${raw}` }];
    const out = (t: string, kind: Line["kind"] = "out") => res.push({ kind, text: t });
    const [cmd = "", ...args] = tokenize(raw.trim());
    let nextCwd = cwd;
    let clear = false;

    switch (cmd.toLowerCase()) {
      case "":
        break;
      case "help":
        [
          "help            tampilkan bantuan ini",
          "ls [path]       lihat isi folder",
          "cd [path]       pindah folder (cd tanpa argumen = kembali ke ~)",
          "pwd             tampilkan folder saat ini",
          "cat <file>      tampilkan isi file",
          "mkdir <nama>    buat folder",
          "touch <nama>    buat file kosong",
          "rm <path>       pindahkan ke Tempat Sampah (rm -f = hapus permanen)",
          "trash           lihat isi Tempat Sampah; empty-trash untuk mengosongkan",
          "echo teks [> file]   cetak teks atau tulis ke file",
          "open <app>      buka aplikasi (lihat 'apps')",
          "apps            daftar aplikasi",
          "theme dark|light    ganti tema",
          "accent #rrggbb  ganti warna aksen",
          "notify <teks>   kirim notifikasi",
          "neofetch        info sistem",
          "whoami, date, uname, history, clear, exit",
        ].forEach((l) => out(l));
        break;
      case "ls": {
        const id = args[0] ? resolvePath(fs.nodes, cwd, args[0]) : cwd;
        const n = id ? fs.nodes[id] : undefined;
        if (!id || !n) out(`ls: ${args[0]}: tidak ditemukan`, "err");
        else if (n.type === "file") out(n.name);
        else {
          const ch = childrenOf(fs.nodes, id);
          out(ch.length ? ch.map((c) => (c.type === "folder" ? c.name + "/" : c.name)).join("   ") : "(kosong)");
        }
        break;
      }
      case "cd": {
        const id = args[0] ? resolvePath(fs.nodes, cwd, args[0]) : ROOT;
        const n = id ? fs.nodes[id] : undefined;
        if (!id || !n) out(`cd: ${args[0]}: tidak ditemukan`, "err");
        else if (n.type !== "folder") out(`cd: ${args[0]}: bukan folder`, "err");
        else nextCwd = id;
        break;
      }
      case "pwd":
        out(pathOf(fs.nodes, cwd));
        break;
      case "cat": {
        const id = args[0] ? resolvePath(fs.nodes, cwd, args[0]) : null;
        const n = id ? fs.nodes[id] : undefined;
        if (!args[0]) out("cat: sebutkan nama file", "err");
        else if (!id || !n) out(`cat: ${args[0]}: tidak ditemukan`, "err");
        else if (n.type === "folder") out(`cat: ${args[0]}: adalah folder`, "err");
        else out(n.content || "(file kosong)");
        break;
      }
      case "mkdir":
        if (!args.length) out("mkdir: sebutkan nama folder", "err");
        else fs.mkdir(cwd, args.join(" "));
        break;
      case "touch":
        if (!args.length) out("touch: sebutkan nama file", "err");
        else fs.touch(cwd, args.join(" "));
        break;
      case "rm": {
        const force = args[0] === "-f";
        const target = force ? args[1] : args[0];
        const id = target ? resolvePath(fs.nodes, cwd, target) : null;
        if (!target) out("rm: sebutkan file atau folder", "err");
        else if (!id) out(`rm: ${target}: tidak ditemukan`, "err");
        else if (isProtected(id) || id === cwd) out("rm: folder sistem atau folder aktif tidak bisa dihapus", "err");
        else if (force) fs.deleteForever(id);
        else fs.trash(id);
        break;
      }
      case "trash": {
        const ch = childrenOf(fs.nodes, TRASH);
        out(ch.length ? ch.map((c) => (c.type === "folder" ? c.name + "/" : c.name)).join("   ") : "(Tempat Sampah kosong)");
        break;
      }
      case "empty-trash":
        fs.emptyTrash();
        out("Tempat Sampah dikosongkan.");
        break;
      case "echo": {
        const gt = args.indexOf(">");
        if (gt === -1) out(args.join(" "));
        else {
          const text = args.slice(0, gt).join(" ");
          const f = args[gt + 1];
          if (!f) out("echo: nama file tujuan kosong", "err");
          else {
            const ex = resolvePath(fs.nodes, cwd, f);
            if (ex && fs.nodes[ex]?.type === "file") fs.write(ex, text);
            else fs.touch(cwd, f, text);
          }
        }
        break;
      }
      case "whoami":
        out(userName);
        break;
      case "date":
        out(new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" }));
        break;
      case "uname":
        out("DapOS 1.0 (web)");
        break;
      case "apps":
        appIds.forEach((id) => out(`${id.padEnd(11)} ${appMeta[id].title}${os.installed.includes(id) ? "" : " (belum dipasang)"}`));
        break;
      case "open": {
        const key = (args.join(" ") || "").toLowerCase();
        const id = appIds.find((i) => i === key || appMeta[i].title.toLowerCase() === key);
        if (id && appMeta[id].noWindow) { os.openApp(id); break; }
        if (!id) out(`open: aplikasi '${key}' tidak ada. Ketik 'apps'.`, "err");
        else os.openApp(id);
        break;
      }
      case "theme":
        if (args[0] === "dark" || args[0] === "light") os.setTheme(args[0]);
        else out("pakai: theme dark | light", "err");
        break;
      case "accent":
        if (args[0] && /^#[0-9a-f]{6}$/i.test(args[0])) os.setAccent(args[0]);
        else out("pakai: accent #rrggbb (contoh: accent #ff7a59)", "err");
        break;
      case "notify":
        os.notify("Terminal", args.join(" ") || "Halo dari terminal");
        break;
      case "history":
        hist.current.forEach((h, i) => out(`${String(i + 1).padStart(3)}  ${h}`));
        break;
      case "neofetch": {
        const mins = Math.floor((Date.now() - os.bootedAt) / 60000);
        BANNER.forEach((b) => out(b));
        out(`OS       DapOS 1.0 (web)`);
        out(`User     ${userName}`);
        out(`Layar    ${window.innerWidth}x${window.innerHeight}`);
        out(`Tema     ${os.theme}, aksen ${os.accent}`);
        out(`Jendela  ${os.windows.length} terbuka`);
        out(`Uptime   ${mins} menit`);
        break;
      }
      case "clear":
        clear = true;
        break;
      case "exit":
        os.closeWindow(win.id);
        return;
      default:
        out(`perintah tidak dikenal: ${cmd}. Ketik 'help'.`, "err");
    }

    if (raw.trim()) hist.current.push(raw.trim());
    hi.current = hist.current.length;
    const mapped = res.map((r) => ({ ...r, id: idc.current++ }));
    setLines((prev) => (clear ? [] : [...prev, ...mapped]));
    setCwd(nextCwd);
  };

  const onKey = (e: RKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (hist.current.length === 0) return;
      hi.current = Math.max(0, hi.current - 1);
      setInput(hist.current[hi.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      hi.current = Math.min(hist.current.length, hi.current + 1);
      setInput(hist.current[hi.current] ?? "");
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="term" onClick={() => inputRef.current?.focus()}>
      {lines.map((l) => (
        <div key={l.id} className={"term-line " + l.kind}>
          {l.text}
        </div>
      ))}
      <div className="term-row">
        <span className="term-prompt">{prompt}</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
        />
      </div>
      <div ref={bottom} />
    </div>
  );
}
