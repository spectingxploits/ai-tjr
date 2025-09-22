// app/petra/sign/page.tsx (or wherever your PetraSignPage lives)
"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import nacl from "tweetnacl";
import type { SignAndSubmitParams } from "@/models/interfaces";
import type { GlobalSignal } from "@/models/interfaces"; // if you export it

const PETRA_LINK_BASE = "https://petra.app/api/v1";
const APP_INFO = {
  domain: typeof window !== "undefined" ? window.location.origin : "https://your-dapp",
  name: "AI_TJR_APP",
};

function hexToU8(hex?: string): Uint8Array {
  if (!hex) return new Uint8Array(0);
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const len = clean.length / 2;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = parseInt(clean.substr(i * 2, 2), 16);
  return arr;
}
function u8ToHex(u8: Uint8Array): string {
  return Array.from(u8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function utf8ToU8(str: string) {
  return new TextEncoder().encode(str);
}

type WrappedParams = SignAndSubmitParams & { telegramChatId?: string };

export default function PetraSignPage() {
  const searchParams = useSearchParams();
  const payloadParam = searchParams.get("payload") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // parse wrapper (SignAndSubmitParams + telegramChatId)
  const parsedWrapper = useMemo<WrappedParams | { __parseError: true; raw: string } | null>(() => {
    if (!payloadParam) return null;
    try {
      const decoded = decodeURIComponent(payloadParam);
      return JSON.parse(decoded) as WrappedParams;
    } catch (e) {
      try {
        return JSON.parse(payloadParam) as WrappedParams;
      } catch (err) {
        return { __parseError: true, raw: payloadParam } as any;
      }
    }
  }, [payloadParam]);

  const publicKeyHex = typeof window !== "undefined" ? localStorage.getItem("petra_public_key") : null;
  const sharedKeyHex = typeof window !== "undefined" ? localStorage.getItem("petra_shared_key") : null;
  const missingKeys = !publicKeyHex || !sharedKeyHex;

  const summary = useMemo(() => {
    if (!parsedWrapper) return null;
    if ((parsedWrapper as any).__parseError) return { error: "Invalid wrapper JSON", raw: (parsedWrapper as any).raw };

    const w = parsedWrapper as WrappedParams;

    // tx summary from w.payload (best-effort)
    let txSummary: any = null;
    try {
      const inner = w.payload;
      if (inner == null) txSummary = { info: "No inner payload" };
      else {
        const p = inner as Record<string, any>;
        const type = p.type ?? p.transaction ?? "unknown";
        const fn = p.function ?? p.function_name ?? p.function ?? "—";
        const typeArgs = p.type_arguments ?? p.typeArguments ?? [];
        const args = p.arguments ?? p.args ?? p.arguments ?? [];
        txSummary = {
          type,
          function: fn,
          typeArgs,
          argsCount: Array.isArray(args) ? args.length : typeof args,
          raw: p,
        };
      }
    } catch (err) {
      txSummary = { error: "Failed to parse inner payload", raw: w.payload };
    }

    return {
      wrapper: {
        userAddress: w.userAddress,
        mainnet: w.mainnet,
        connectorName: w.connectorName,
        telegramChatId: w.telegramChatId,
        signal: w.signal as GlobalSignal | undefined,
      },
      txSummary,
    };
  }, [parsedWrapper]);

  async function handleSignAndSubmit() {
    setError(null);
    setBusy(true);
    try {
      if (!parsedWrapper || (parsedWrapper as any).__parseError) {
        throw new Error("Invalid or missing payload query parameter");
      }
      if (!publicKeyHex || !sharedKeyHex) {
        throw new Error("Missing petra_public_key or petra_shared_key in localStorage. Please connect with Petra first.");
      }

      const wrapper = parsedWrapper as WrappedParams;
      const innerPayload = wrapper.payload;
      if (!innerPayload) throw new Error("Missing inner transaction payload");

      const payloadB64 = typeof window !== "undefined" ? window.btoa(JSON.stringify(innerPayload)) : Buffer.from(JSON.stringify(innerPayload)).toString("base64");

      const nonce = nacl.randomBytes(24);
      const sharedSecret = hexToU8(sharedKeyHex!);
      if (sharedSecret.length === 0) throw new Error("Invalid shared secret");

      const messageU8 = utf8ToU8(payloadB64);
      const encrypted = nacl.box.after(messageU8, nonce, sharedSecret);

      const dataObj = {
        appInfo: APP_INFO,
        payload: u8ToHex(encrypted),
        redirectLink: `${window.location.origin}/petra/response?source=miniapp&ref=ai_tjr`,
        dappEncryptionPublicKey: publicKeyHex,
        nonce: u8ToHex(nonce),
      };

      const dataB64 = typeof window !== "undefined" ? window.btoa(JSON.stringify(dataObj)) : Buffer.from(JSON.stringify(dataObj)).toString("base64");
      const url = `${PETRA_LINK_BASE}/signAndSubmit?data=${encodeURIComponent(dataB64)}`;
      window.open(url, "_blank");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // small helper to render the signal fields grid (skip nulls)
  const renderSignalGrid = (signal?: GlobalSignal) => {
    if (!signal) return <div className="text-sm text-slate-400">No signal provided</div>;

    const entries = [
      ["market", String(signal.market)],
      ["enter", String(signal.enter)],
      ["profit", String(signal.profit)],
      ["loss", String(signal.loss)],
      ["tp", String(signal.tp)],
      ["sl", String(signal.sl)],
      ["lq", String(signal.lq)],
      ["leverage", String(signal.leverage)],
      ["long", String(signal.long)],
      ["symbol", String(signal.symbol ?? "—")],
      ["aiDetectedSuccessRate", String(signal.aiDetectedSuccessRate ?? "—")],
    ] as [string, string][];

    return (
      <>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="text-slate-300 font-medium">{k}</div>
              <div className="text-slate-200 truncate">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="text-slate-300 font-medium text-sm mb-1">Reasons</div>
          <div className="text-sm text-slate-200">
            {Array.isArray(signal.reasons) && signal.reasons.length > 0
              ? signal.reasons.map((r, i) => <div key={i}>• {r}</div>)
              : <div className="text-slate-400">—</div>}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
      <div className="max-w-3xl w-full bg-slate-800/60 backdrop-blur rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Sign & Submit — Review</h2>

        {!payloadParam && (
          <div className="p-4 rounded bg-yellow-900/30 text-yellow-300">Missing <code>payload</code> query parameter.</div>
        )}

        {parsedWrapper && (parsedWrapper as any).__parseError && (
          <div className="p-4 rounded bg-red-900/40 text-red-300">Failed to parse payload. Raw: {(parsedWrapper as any).raw}</div>
        )}

        {summary && !("error" in summary) && (
          <div className="space-y-4">
            <section className="p-4 bg-slate-900/30 rounded">
              <h3 className="font-semibold mb-2">Request details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-300 font-medium">User (telegram userAddress)</div>
                  <div className="text-slate-200 truncate">{String(summary.wrapper.userAddress ?? "—")}</div>
                </div>
                <div>
                  <div className="text-slate-300 font-medium">Telegram chat id</div>
                  <div className="text-slate-200 truncate">{String(summary.wrapper.telegramChatId ?? "—")}</div>
                </div>
                <div>
                  <div className="text-slate-300 font-medium">Connector</div>
                  <div className="text-slate-200 truncate">{String(summary.wrapper.connectorName ?? "—")}</div>
                </div>
                <div>
                  <div className="text-slate-300 font-medium">Mainnet</div>
                  <div className="text-slate-200 truncate">{String(summary.wrapper.mainnet ?? false)}</div>
                </div>
              </div>
            </section>

            <section className="p-4 bg-slate-900/30 rounded">
              <h3 className="font-semibold mb-2">Global signal</h3>

              {/* scrollable signal box */}
              <div className="max-h-56 overflow-y-auto p-3 bg-slate-800/50 rounded">
                {renderSignalGrid(summary.wrapper.signal)}
                <div className="mt-3 border-t border-slate-700 pt-3">
                  <div className="text-slate-300 font-medium text-sm mb-2">Raw signal JSON</div>
                  <pre className="whitespace-pre-wrap text-xs text-slate-200">{JSON.stringify(summary.wrapper.signal ?? {}, null, 2)}</pre>
                </div>
              </div>
            </section>

            <section className="p-4 bg-slate-900/30 rounded">
              <h3 className="font-semibold mb-2">Transaction preview</h3>
              {summary.txSummary && summary.txSummary.error ? (
                <div className="text-red-300 text-sm">{summary.txSummary.error}</div>
              ) : (
                <>
                  <div className="text-sm"><strong>Type:</strong> {String(summary.txSummary.type ?? "—")}</div>
                  <div className="text-sm"><strong>Function:</strong> {String(summary.txSummary.function ?? "—")}</div>
                  <div className="text-sm"><strong>Type args:</strong> {Array.isArray(summary.txSummary.typeArgs) ? (summary.txSummary.typeArgs.join(", ") || "—") : "—"}</div>
                  <div className="text-sm"><strong>Arguments:</strong> {String(summary.txSummary.argsCount)}</div>

                  <details className="mt-2 p-3 bg-slate-900/20 rounded">
                    <summary className="cursor-pointer">Full transaction payload</summary>
                    <pre className="whitespace-pre-wrap text-sm mt-2">{JSON.stringify(summary.txSummary.raw, null, 2)}</pre>
                  </details>
                </>
              )}
            </section>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {missingKeys && (
            <div className="p-3 rounded bg-red-900/30 text-red-200">
              Missing Petra keys in localStorage. Please connect to Petra first (store <code>petra_public_key</code> and <code>petra_shared_key</code>).
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-red-900/40 text-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSignAndSubmit}
              disabled={busy || !parsedWrapper || missingKeys}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold disabled:opacity-50"
            >
              {busy ? "Preparing..." : "Sign & Submit with Petra"}
            </button>

            <a
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-700/30"
              href={
                parsedWrapper
                  ? `data:application/json,${encodeURIComponent(JSON.stringify(parsedWrapper, null, 2))}`
                  : "#"
              }
              download="wrapped_payload.json"
            >
              Download Full Request
            </a>
          </div>

          <div className="text-sm text-slate-400 mt-2">
            Petra will redirect back to <code>/petra/response</code> with a <code>response</code> and <code>data</code> parameter.
          </div>
        </div>
      </div>
    </div>
  );
}
