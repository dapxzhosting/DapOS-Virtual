import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, RotateCcw } from "lucide-react";

type Tab = "mines" | "snake" | "g2048";

const best = {
  get: (k: string) => {
    try {
      return Number(localStorage.getItem("dapos-best-" + k)) || 0;
    } catch {
      return 0;
    }
  },
  set: (k: string, v: number) => {
    try {
      localStorage.setItem("dapos-best-" + k, String(v));
    } catch {
      window.dispatchEvent(new Event("dapos-quota"));
    }
  },
};

interface Cell { mine: boolean; open: boolean; flag: boolean; n: number }
const SIZE = 9;
const MINES = 10;

const blank = (): Cell[] => Array.from({ length: SIZE * SIZE }, () => ({ mine: false, open: false, flag: false, n: 0 }));
const neighbors = (i: number) => {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(rr * SIZE + cc);
    }
  return out;
};

function Mines() {
  const [cells, setCells] = useState<Cell[]>(blank);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<"play" | "won" | "lost">("play");
  const [flagMode, setFlagMode] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!started || state !== "play") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, state]);

  const reset = () => {
    setCells(blank());
    setStarted(false);
    setState("play");
    setSecs(0);
  };

  const reveal = (cs: Cell[], i: number) => {
    const stack = [i];
    while (stack.length) {
      const k = stack.pop() as number;
      const c = cs[k];
      if (!c || c.open || c.flag) continue;
      c.open = true;
      if (c.n === 0 && !c.mine) stack.push(...neighbors(k));
    }
  };

  const click = (i: number, forceFlag = false) => {
    if (state !== "play") return;
    const cs = cells.map((c) => ({ ...c }));
    const cell = cs[i];
    if (!cell) return;
    if (forceFlag || flagMode) {
      if (!cell.open) cell.flag = !cell.flag;
      setCells(cs);
      return;
    }
    if (cell.flag || cell.open) return;
    if (!started) {
      const safe = new Set([i, ...neighbors(i)]);
      let placed = 0;
      while (placed < MINES) {
        const k = Math.floor(Math.random() * cs.length);
        const c = cs[k];
        if (c && !c.mine && !safe.has(k)) {
          c.mine = true;
          placed++;
        }
      }
      cs.forEach((c, k) => {
        c.n = neighbors(k).filter((m) => cs[m]?.mine).length;
      });
      setStarted(true);
    }
    if (cell.mine) {
      cs.forEach((c) => c.mine && (c.open = true));
      setCells(cs);
      setState("lost");
      return;
    }
    reveal(cs, i);
    setCells(cs);
    if (cs.every((c) => c.mine || c.open)) setState("won");
  };

  const flags = cells.filter((c) => c.flag).length;
  const colors = ["", "#60a5fa", "#4ade80", "#f87171", "#a78bfa", "#fb923c", "#2dd4bf", "#e5e7eb", "#94a3b8"];

  return (
    <div className="g-pane">
      <div className="g-top">
        <span>💣 {MINES - flags}</span>
        <button className={"chip" + (flagMode ? " on" : "")} onClick={() => setFlagMode((v) => !v)}>
          <Flag size={14} /> Bendera
        </button>
        <span>⏱ {secs}s</span>
        <button className="icon-btn" aria-label="Main lagi" onClick={reset}>
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="mines" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
        {cells.map((c, i) => (
          <button
            key={i}
            className={"mine" + (c.open ? " open" : "") + (c.open && c.mine ? " boom" : "")}
            onClick={() => click(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              click(i, true);
            }}
            style={{ color: colors[c.n] }}
          >
            {c.open ? (c.mine ? "💥" : c.n > 0 ? c.n : "") : c.flag ? "🚩" : ""}
          </button>
        ))}
      </div>
      <p className="g-msg">
        {state === "won" ? "Kamu menang! 🎉" : state === "lost" ? "Kena ranjau. Coba lagi." : "Klik kiri untuk membuka, klik kanan atau mode Bendera untuk menandai."}
      </p>
    </div>
  );
}

const G = 18;
type P = { x: number; y: number };

function Snake() {
  const [snake, setSnake] = useState<P[]>([{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }]);
  const [food, setFood] = useState<P>({ x: 13, y: 9 });
  const [score, setScore] = useState(0);
  const [top, setTop] = useState(() => best.get("snake"));
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const dir = useRef<P>({ x: 1, y: 0 });
  const next = useRef<P>({ x: 1, y: 0 });
  const box = useRef<HTMLDivElement>(null);

  const turn = useCallback((x: number, y: number) => {
    if (x === -dir.current.x && y === -dir.current.y) return;
    next.current = { x, y };
    setRunning(true);
  }, []);

  const reset = () => {
    setSnake([{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }]);
    setFood({ x: 13, y: 9 });
    setScore(0);
    setOver(false);
    setRunning(false);
    dir.current = { x: 1, y: 0 };
    next.current = { x: 1, y: 0 };
    box.current?.focus();
  };

  useEffect(() => {
    if (!running || over) return;
    const t = setInterval(() => {
      setSnake((s) => {
        dir.current = next.current;
        const head = s[0] as P;
        const h = { x: head.x + dir.current.x, y: head.y + dir.current.y };
        if (h.x < 0 || h.y < 0 || h.x >= G || h.y >= G || s.some((p) => p.x === h.x && p.y === h.y)) {
          setOver(true);
          setRunning(false);
          return s;
        }
        const ate = h.x === food.x && h.y === food.y;
        const grown = [h, ...s];
        if (!ate) grown.pop();
        else {
          setScore((v) => {
            const nv = v + 1;
            setTop((b) => {
              if (nv > b) best.set("snake", nv);
              return Math.max(b, nv);
            });
            return nv;
          });
          let f: P;
          do f = { x: Math.floor(Math.random() * G), y: Math.floor(Math.random() * G) };
          while (grown.some((p) => p.x === f.x && p.y === f.y));
          setFood(f);
        }
        return grown;
      });
    }, 120);
    return () => clearInterval(t);
  }, [running, over, food]);

  const onKey = (e: React.KeyboardEvent) => {
    const m: Record<string, [number, number]> = {
      ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
    };
    const v = m[e.key];
    if (v) {
      e.preventDefault();
      turn(v[0], v[1]);
    }
  };

  return (
    <div className="g-pane" ref={box} tabIndex={0} onKeyDown={onKey} autoFocus>
      <div className="g-top">
        <span>Skor {score}</span>
        <span>Terbaik {top}</span>
        <button className="icon-btn" aria-label="Main lagi" onClick={reset}>
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="snake" style={{ gridTemplateColumns: `repeat(${G}, 1fr)` }}>
        {Array.from({ length: G * G }, (_, i) => {
          const x = i % G;
          const y = Math.floor(i / G);
          const idx = snake.findIndex((p) => p.x === x && p.y === y);
          const cls = idx === 0 ? "head" : idx > 0 ? "body" : food.x === x && food.y === y ? "food" : "";
          return <i key={i} className={cls} />;
        })}
      </div>
      <div className="dpad">
        <button onClick={() => turn(0, -1)} aria-label="Atas">▲</button>
        <div>
          <button onClick={() => turn(-1, 0)} aria-label="Kiri">◀</button>
          <button onClick={() => turn(0, 1)} aria-label="Bawah">▼</button>
          <button onClick={() => turn(1, 0)} aria-label="Kanan">▶</button>
        </div>
      </div>
      <p className="g-msg">{over ? "Game over. Tekan tombol ulang." : running ? "Gunakan panah/WASD." : "Tekan panah untuk mulai."}</p>
    </div>
  );
}

type Board = number[][];
const empty = (): Board => Array.from({ length: 4 }, () => [0, 0, 0, 0]);
const spawn = (b: Board): Board => {
  const free: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => v === 0 && free.push([r, c])));
  if (!free.length) return b;
  const [r, c] = free[Math.floor(Math.random() * free.length)] as [number, number];
  const nb = b.map((row) => [...row]);
  (nb[r] as number[])[c] = Math.random() < 0.9 ? 2 : 4;
  return nb;
};
const start = () => spawn(spawn(empty()));

function slideRow(row: number[]): { row: number[]; gain: number } {
  const vals = row.filter((v) => v);
  let gain = 0;
  const out: number[] = [];
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i] as number;
    if (vals[i + 1] === v) {
      out.push(v * 2);
      gain += v * 2;
      i++;
    } else out.push(v);
  }
  while (out.length < 4) out.push(0);
  return { row: out, gain };
}

function move(b: Board, dir: "left" | "right" | "up" | "down"): { board: Board; gain: number; moved: boolean } {
  let gain = 0;
  const get = (i: number): number[] => {
    if (dir === "left") return [...(b[i] as number[])];
    if (dir === "right") return [...(b[i] as number[])].reverse();
    const col = b.map((r) => r[i] as number);
    return dir === "up" ? col : col.reverse();
  };
  const lines = [0, 1, 2, 3].map((i) => {
    const r = slideRow(get(i));
    gain += r.gain;
    return r.row;
  });
  const nb = empty();
  lines.forEach((line, i) => {
    const l = [...line];
    if (dir === "right" || dir === "down") l.reverse();
    l.forEach((v, j) => {
      if (dir === "left" || dir === "right") (nb[i] as number[])[j] = v;
      else (nb[j] as number[])[i] = v;
    });
  });
  const moved = nb.some((row, r) => row.some((v, c) => v !== (b[r] as number[])[c]));
  return { board: nb, gain, moved };
}

const canMove = (b: Board) => (["left", "right", "up", "down"] as const).some((d) => move(b, d).moved);

function Game2048() {
  const [board, setBoard] = useState<Board>(start);
  const [score, setScore] = useState(0);
  const [top, setTop] = useState(() => best.get("2048"));
  const touch = useRef<{ x: number; y: number } | null>(null);
  const over = !canMove(board);

  const play = (d: "left" | "right" | "up" | "down") => {
    const r = move(board, d);
    if (!r.moved) return;
    setBoard(spawn(r.board));
    const ns = score + r.gain;
    setScore(ns);
    if (ns > top) {
      setTop(ns);
      best.set("2048", ns);
    }
  };
  const reset = () => {
    setBoard(start());
    setScore(0);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const m: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    const d = m[e.key];
    if (d) {
      e.preventDefault();
      play(d);
    }
  };

  return (
    <div
      className="g-pane"
      tabIndex={0}
      autoFocus
      onKeyDown={onKey}
      onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t) return;
        const dx = e.clientX - t.x;
        const dy = e.clientY - t.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
      }}
    >
      <div className="g-top">
        <span>Skor {score}</span>
        <span>Terbaik {top}</span>
        <button className="icon-btn" aria-label="Main lagi" onClick={reset}>
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="b2048">
        {board.flat().map((v, i) => (
          <i key={i} className={"t" + (v > 2048 ? 2048 : v)}>
            {v || ""}
          </i>
        ))}
      </div>
      <p className="g-msg">{over ? "Tidak ada gerakan lagi. Tekan tombol ulang." : "Gunakan panah keyboard atau geser layar."}</p>
    </div>
  );
}

export default function Games() {
  const [tab, setTab] = useState<Tab>("mines");
  return (
    <div className="games">
      <div className="tabs">
        <button className={tab === "mines" ? "on" : ""} onClick={() => setTab("mines")}>Minesweeper</button>
        <button className={tab === "snake" ? "on" : ""} onClick={() => setTab("snake")}>Snake</button>
        <button className={tab === "g2048" ? "on" : ""} onClick={() => setTab("g2048")}>2048</button>
      </div>
      {tab === "mines" && <Mines />}
      {tab === "snake" && <Snake />}
      {tab === "g2048" && <Game2048 />}
    </div>
  );
}
