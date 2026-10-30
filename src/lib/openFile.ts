import { useOS } from "../store/os";
import type { FsNode } from "../store/fs";
import type { AppId } from "../types";

const IMG = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;
const AUDIO = /\.(webm|ogg|mp3|wav|m4a)$/i;
const CODE = /\.(js|jsx|ts|tsx|json|css|html|md|py|kt|java|dart|sh|yml|yaml|xml|sql)$/i;

export const isImage = (n: FsNode) => IMG.test(n.name) || n.content.startsWith("data:image");
export const isAudio = (n: FsNode) => n.content.startsWith("data:audio") || (AUDIO.test(n.name) && n.content.startsWith("data:"));

export function openNode(n: FsNode) {
  const os = useOS.getState();
  if (n.type === "folder") return os.openApp("explorer", { folderId: n.id });
  if (isImage(n)) return os.openApp("gallery", { fileId: n.id });
  if (isAudio(n)) return os.openApp("camera", { tab: "rekam" });
  if (CODE.test(n.name)) {
    const app: AppId = os.installed.includes("editor") ? "editor" : "notepad";
    return os.openApp(app, { fileId: n.id });
  }
  return os.openApp("notepad", { fileId: n.id });
}
