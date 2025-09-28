import { FunctionArgument } from "@/models/interfaces";

// Utility: normalize arguments recursively
export function normalizeArgument(arg: FunctionArgument): string {
  if (arg === null || arg === undefined) return "null";
  if (typeof arg === "bigint") return arg.toString();
  if (typeof arg === "number") return arg.toString();
  if (typeof arg === "boolean") return arg.toString();
  if (typeof arg === "string") return arg;
  if (arg instanceof Uint8Array) return Buffer.from(arg).toString("hex");
  if (Array.isArray(arg)) return JSON.stringify(arg.map(normalizeArgument));
  if (typeof arg === "object") return JSON.stringify(arg);
  return String(arg);
}
