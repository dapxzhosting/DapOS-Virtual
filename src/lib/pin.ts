export async function hashPin(pin: string): Promise<string> {
  const input = "dapos:" + pin;
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    return fallbackHash(input);
  }
  return fallbackHash(input);
}

function fallbackHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return "d" + h.toString(16);
}
