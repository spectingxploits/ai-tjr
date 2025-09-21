"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import nacl from "tweetnacl";

/**
 * Petra Sign & Submit page
 *
 * Expects a query parameter `payload` containing the JSON.stringify(...) of the transaction payload.
 * Example URL:
 *   /petra/sign?payload=%7B%22type%22%3A%22entry_function_payload%22%2C...%7D
 *
 * It will:
 *  - parse and display the payload summary
 *  - encrypt the payload using the shared secret (from localStorage)
 *  - open the Petra deep link to signAndSubmit with the data param
 *
 * Required localStorage keys (written by your Connect flow):
 *  - petra_public_key  (hex string)
 *  - petra_shared_key  (hex string)  <-- this is the shared secret produced via nacl.box.before(...)
 */

const PETRA_LINK_BASE = "https://petra.app/api/v1"; // safe web fallback that opens the app
const APP_INFO = {
  domain: typeof window !== "undefined" ? window.location.origin : "https://your-dapp",
  name: "AI_TJR_APP",
};

// helpers: hex <-> Uint8Array
function hexToU8(hex?: string): Uint8Array {
  if (!hex) return new Uint8Array(0);
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const len = clean.length / 2;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return arr;
}

function u8ToHex(u8: Uint8Array): string {
  return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function utf8ToU8(str: string) {
  return new TextEncoder().encode(str);
}

export default function PetraSignPage() {
  const searchParams = useSearchParams();
  const payloadParam = searchParams.get("payload") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // parse payload string -> object (defensive)
  const parsedPayload = useMemo(() => {
    if (!payloadParam) return null;
    try {
      // the incoming param should be an URL-encoded JSON string (stringified payload)
      const decoded = decodeURIComponent(payloadParam);
      const obj = JSON.parse(decoded);
      return obj;
    } catch (e) {
      try {
        // fallback: maybe it was not encoded
        return JSON.parse(payloadParam);
      } catch (err) {
        return { __parseError: true, raw: payloadParam };
      }
    }
  }, [payloadParam]);

  // read keys from localStorage
  const publicKeyHex = typeof window !== "undefined" ? localStorage.getItem("petra_public_key") : null;
  const sharedKeyHex = typeof window !== "undefined" ? localStorage.getItem("petra_shared_key") : null;

  const missingKeys = !publicKeyHex || !sharedKeyHex;

  // summary for UI
  const txSummary = useMemo(() => {
    if (!parsedPayload) return null;
    if ((parsedPayload as any).__parseError) return { error: "Invalid JSON payload" };
    const p = parsedPayload as Record<string, any>;

    // try to extract common details
    const type = p.type ?? p.transaction ?? "unknown";
    const fn = p.function ?? p.function_name ?? p.function || p.function;
    const typeArgs = p.type_arguments ?? p.typeArguments ?? [];
    const args = p.arguments ?? p.args ?? p.arguments;
    return {
      type,
      function: fn,
      typeArgs,
      argsCount: Array.isArray(args) ? args.length : typeof args,
      raw: p,
    };
  }, [parsedPayload]);

  async function handleSignAndSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (!parsedPayload || (parsedPayload as any).__parseError) {
        throw new Error("Invalid or missing payload query parameter");
      }
      if (!publicKeyHex || !sharedKeyHex) {
        throw new Error("Missing petra_public_key or petra_shared_key in localStorage. Please connect with Petra first.");
      }

      // Step A: create the payload string (following Petra doc example)
      // Petra example base64-encodes the payload JSON and then encrypts that b64 string
      const payloadB64 = btoa(JSON.stringify(parsedPayload));

      // Step B: create nonce and encrypt with shared secret (nacl.box.after)
      const nonce = nacl.randomBytes(24);
      const sharedSecret = hexToU8(sharedKeyHex); // already the shared secret (result of nacl.box.before)
      if (sharedSecret.length === 0) throw new Error("Invalid shared secret");

      const messageU8 = utf8ToU8(payloadB64);
      const encrypted = nacl.box.after(messageU8, nonce, sharedSecret); // Uint8Array

      // Step C: build data object per Petra docs
      const dataObj = {
        appInfo: APP_INFO,
        payload: u8ToHex(encrypted), // hex string
        redirectLink: `${window.location.origin}/petra/response?source=miniapp&fixedParam=ai_tjr`, // hardcoded extra params
        dappEncryptionPublicKey: publicKeyHex.startsWith("0x") ? publicKeyHex : publicKeyHex, // hex public key
        nonce: u8ToHex(nonce),
      };

      const dataB64 = btoa(JSON.stringify(dataObj));

      // Final: open the Petra deep link
      const url = `${PETRA_LINK_BASE}/signAndSubmit?data=${encodeURIComponent(dataB64)}`;
      // open in a new tab / mobile will open the Petra app
      window.open(url, "_blank");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
      <div className="max-w-2xl w-full bg-slate-800/60 backdrop-blur rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Sign & Submit Transaction (Petra)</h2>

        {!payloadParam && (
          <div className="p-4 rounded bg-yellow-900/30 text-yellow-300">
            Missing <code>payload</code> query parameter. Provide the transaction as <code>JSON.stringify(payload)</code> and URL-encode it.
          </div>
        )}

        {parsedPayload && (parsedPayload as any).__parseError && (
          <div className="p-4 rounded bg-red-900/40 text-red-300">Failed to parse payload JSON. Raw: {String((parsedPayload as any).raw)}</div>
        )}

        {txSummary && !txSummary.error && (
          <div className="space-y-3">
            <div>
              <strong>Type:</strong> {String(txSummary.type)}
            </div>
            <div>
              <strong>Function:</strong> {String(txSummary.function ?? "—")}
            </div>
            <div>
              <strong>Type args:</strong> {Array.isArray(txSummary.typeArgs) ? txSummary.typeArgs.join(", ") || "—" : "—"}
            </div>
            <div>
              <strong>Arguments:</strong> {String(txSummary.argsCount)}
            </div>
            <details className="mt-2 p-3 bg-slate-900/30 rounded">
              <summary className="cursor-pointer">Full payload</summary>
              <pre className="whitespace-pre-wrap text-sm mt-2">{JSON.stringify(txSummary.raw, null, 2)}</pre>
            </details>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {missingKeys ? (
            <div className="p-3 rounded bg-red-900/30 text-red-200">
              Missing Petra keys in localStorage. Please connect to Petra first so we have:
              <ul className="ml-4 list-disc">
                <li><code>petra_public_key</code> (hex)</li>
                <li><code>petra_shared_key</code> (hex) — the shared secret</li>
              </ul>
            </div>
          ) : null}

          {error && (
            <div className="p-3 rounded bg-red-900/40 text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSignAndSubmit}
              disabled={busy || !parsedPayload || missingKeys}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold disabled:opacity-50"
            >
              {busy ? "Preparing..." : "Sign & Submit with Petra"}
            </button>

            <a
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/30"
              href={payloadParam ? `data:application/json,${encodeURIComponent(JSON.stringify(parsedPayload))}` : "#"}
              download="payload.json"
            >
              Download Payload
            </a>
          </div>

          <div className="text-sm text-slate-400 mt-2">
            Note: Petra will redirect back to <code>/petra/response</code> with a <code>response</code> and <code>data</code> parameter.
          </div>
        </div>
      </div>
    </div>
  );
}
