// cryptoHelpers.ts (works in both client and server as needed)
export function strip0x(s?: string) {
  if (!s) return "";
  return s.startsWith("0x") ? s.slice(2) : s;
}
export function hexToU8(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(strip0x(hex), "hex"));
}
export function u8ToHex(u8: Uint8Array): string {
  return Buffer.from(u8).toString("hex");
}

/** base64url encode/decode (URL-safe) */
export function u8ToBase64Url(u8: Uint8Array) {
  const b64 = Buffer.from(u8).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function base64UrlToU8(s: string) {
  // restore padding
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  return new Uint8Array(Buffer.from(s, "base64"));
}
