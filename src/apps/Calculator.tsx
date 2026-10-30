import { useState } from "react";

const apply = (a: number, b: number, o: string) =>
  o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : o === "÷" ? (b === 0 ? NaN : a / b) : b;
const fmt = (n: number) => (Number.isFinite(n) ? String(+n.toPrecision(12)) : "Tidak valid");

export default function Calculator() {
  const [disp, setDisp] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const cur = () => {
    const n = parseFloat(disp);
    return Number.isNaN(n) ? 0 : n;
  };
  const reset = () => {
    setDisp("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  };
  const digit = (d: string) => {
    if (fresh || disp === "Tidak valid") {
      setDisp(d === "." ? "0." : d);
      setFresh(false);
      return;
    }
    if (d === "." && disp.includes(".")) return;
    setDisp(disp === "0" && d !== "." ? d : disp + d);
  };
  const operator = (o: string) => {
    const c = cur();
    if (acc !== null && op && !fresh) {
      const r = apply(acc, c, op);
      if (!Number.isFinite(r)) {
        setDisp("Tidak valid");
        setAcc(null);
        setOp(null);
        setFresh(true);
        return;
      }
      setAcc(r);
      setDisp(fmt(r));
    } else setAcc(c);
    setOp(o);
    setFresh(true);
  };
  const equals = () => {
    if (acc === null || !op) return;
    setDisp(fmt(apply(acc, cur(), op)));
    setAcc(null);
    setOp(null);
    setFresh(true);
  };
  const back = () => {
    if (fresh) return;
    setDisp(disp.length > 1 ? disp.slice(0, -1) : "0");
  };

  const keys: { l: string; cls?: string; fn: () => void }[] = [
    { l: "C", fn: reset },
    { l: "⌫", fn: back },
    { l: "%", fn: () => setDisp(fmt(cur() / 100)) },
    { l: "÷", cls: "op", fn: () => operator("÷") },
    ...["7", "8", "9"].map((d) => ({ l: d, fn: () => digit(d) })),
    { l: "×", cls: "op", fn: () => operator("×") },
    ...["4", "5", "6"].map((d) => ({ l: d, fn: () => digit(d) })),
    { l: "−", cls: "op", fn: () => operator("−") },
    ...["1", "2", "3"].map((d) => ({ l: d, fn: () => digit(d) })),
    { l: "+", cls: "op", fn: () => operator("+") },
    { l: "±", fn: () => cur() !== 0 && setDisp(fmt(-cur())) },
    { l: "0", fn: () => digit("0") },
    { l: ".", fn: () => digit(".") },
    { l: "=", cls: "eq", fn: equals },
  ];

  return (
    <div
      className="calc"
      tabIndex={0}
      autoFocus
      onKeyDown={(e) => {
        const k = e.key;
        if (/^[0-9.]$/.test(k)) digit(k);
        else if (k === "+") operator("+");
        else if (k === "-") operator("−");
        else if (k === "*") operator("×");
        else if (k === "/") {
          e.preventDefault();
          operator("÷");
        } else if (k === "Enter" || k === "=") equals();
        else if (k === "Backspace") back();
        else if (k === "Escape") reset();
      }}
    >
      <div className="calc-disp">
        <small>{acc !== null && op ? `${fmt(acc)} ${op}` : "\u00a0"}</small>
        <b>{disp}</b>
      </div>
      <div className="calc-grid">
        {keys.map((k) => (
          <button key={k.l} className={"ck " + (k.cls ?? "")} onClick={k.fn}>
            {k.l}
          </button>
        ))}
      </div>
    </div>
  );
}
