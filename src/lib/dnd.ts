export const DND_MIME = "application/x-dapos";
export interface DragPayload { kind: "app" | "trash" | "node"; id: string }

let off = { x: 40, y: 30 };
export const setDragOffset = (x: number, y: number) => {
  off = { x, y };
};
export const getDragOffset = () => off;

export const startDrag = (e: { dataTransfer: DataTransfer }, p: DragPayload) => {
  e.dataTransfer.setData(DND_MIME, JSON.stringify(p));
  e.dataTransfer.effectAllowed = "move";
};
export const hasDrag = (e: { dataTransfer: DataTransfer }) =>
  Array.from(e.dataTransfer.types).includes(DND_MIME);
export const readDrag = (e: { dataTransfer: DataTransfer }): DragPayload | null => {
  try {
    const raw = e.dataTransfer.getData(DND_MIME);
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
};
