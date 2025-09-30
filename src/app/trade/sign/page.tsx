// app/petra/sign/page.tsx (or wherever your PetraSignPage lives)
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import nacl from "tweetnacl";
import type { SignAndSubmitParams } from "@/models/interfaces";
import type { GlobalSignal } from "@/models/interfaces"; // if you export it
import SuperJSON from "superjson";
import { toAptosStandardPayload } from "@/lib/helpers/utils";

const PETRA_LINK_BASE = "https://petra.app/api/v1";
const APP_INFO = {
  domain: `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/auth`,
  name: "AI_TJR",
};

type WrappedParams = SignAndSubmitParams & { telegramChatId?: string };

export default function PetraSignPage() {
  const searchParams = useSearchParams();
  const payloadParam = searchParams.get("payload") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicKeyHex, setPublicKeyHex] = useState<string | null>(null);
  const [userPubKey, setUserPubKey] = useState<string | null>(null);
  // parse wrapper (SignAndSubmitParams + telegramChatId)
  const parsedWrapper = useMemo<
    WrappedParams | { __parseError: true; raw: string } | null
  >(() => {
    if (!payloadParam) return null;
    try {
      const decoded = decodeURIComponent(payloadParam);
      return SuperJSON.parse(decoded) as WrappedParams; // necessary with super json
    } catch (e) {
      try {
        return SuperJSON.parse(payloadParam) as WrappedParams; // necessary with super json
      } catch (err) {
        return { __parseError: true, raw: payloadParam } as any;
      }
    }
  }, [payloadParam]);

  useEffect(() => {
    // window.open(window.location.href);
    if (!parsedWrapper || !(parsedWrapper as WrappedParams).telegramChatId)
      return;

    async function fetchPublicKey() {
      try {
        const w = parsedWrapper as WrappedParams;
        const res = await fetch(
          `/api/users/getSharedKey?user_tg_id=${encodeURIComponent(
            w.telegramChatId!
          )}`
        );
        if (!res.ok) {
          console.warn("getConnected non-ok:", res.status);
          setError("Failed to fetch public key from server");
          return;
        }
        const data = await res.json();
        setPublicKeyHex(data.shared_key || null);
        setUserPubKey(data.user_pub_key || null);
      } catch (err) {
        console.error(err);
        setError("Error fetching public key");
      }
    }

    fetchPublicKey();
  }, [parsedWrapper]);

  const summary = useMemo(() => {
    if (!parsedWrapper) return null;
    if ((parsedWrapper as any).__parseError)
      return { error: "Invalid wrapper JSON", raw: (parsedWrapper as any).raw };

    const w = parsedWrapper as WrappedParams;
    console.log("payload type:", typeof w.payload, w.payload);
    // tx summary from w.payload (best-effort)
    let txSummary: any = null;
    try {
      const inner = w.payload;
      if (inner == null) txSummary = { info: "No inner payload" };
      else {
        const p = inner as Record<string, any>;
        const type = p.type ?? p.transaction ?? "entry_function_payload";
        const fn = p.function ?? p.function_name ?? "—";
        const typeArgs =
          p.type_arguments ?? p.typeArguments ?? p.typeArgs ?? [];
        const args = p.arguments ?? p.args ?? p.functionArguments ?? [];

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
      if (!publicKeyHex) {
        throw new Error(
          "Missing petra_public_key or petra_shared_key in localStorage. Please connect with Petra first."
        );
      }

      const wrapper = parsedWrapper as WrappedParams;
      const innerPayload = wrapper.payload;
      if (!innerPayload) throw new Error("Missing inner transaction payload");

      const nonce = nacl.randomBytes(24);

      let parsed_payload = toAptosStandardPayload(wrapper.payload);

      let payload = btoa(stringifyJsonWithBigInt(parsed_payload));
      const encrypted = nacl.box.after(
        Buffer.from(stringifyJsonWithBigInt(payload)),
        nonce,
        Uint8Array.from(Buffer.from(publicKeyHex, "hex"))
      );
      const dataObj = btoa(
        stringifyJsonWithBigInt({
          appInfo: APP_INFO,
          payload: Buffer.from(encrypted).toString("hex"),
          redirectLink: `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/trade/response?source=miniapp&ref=ai_tjr`,
          dappEncryptionPublicKey: userPubKey,
          nonce: Buffer.from(nonce).toString("hex"),
        })
      );

      const url = `${PETRA_LINK_BASE}/signAndSubmit?data=${dataObj}`;
      if ((window as any).aptos) {
        await (window as any).aptos.signAndSubmitTransaction({
          payload: wrapper.payload,
        });
      }
      window.open(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // small helper to render the signal fields grid (skip nulls)
  const renderSignalGrid = (signal?: GlobalSignal) => {
    if (!signal)
      return <div className="text-sm text-slate-400">No signal provided</div>;

    const entries = [
      ["market", String(signal.market)],
      ["enter", String(signal.enter)],
      ["profit %", String(signal.profit)],
      ["loss %", String(signal.loss)],
      ["tp", String(signal.tp)],
      ["sl", String(signal.sl)],
      ["liquidity", String(signal.lq)],
      ["leverage", String(signal.leverage)],
      ["long", String(signal.long)],
      ["symbol", String(signal.symbol ?? "—")],
      ["aiDetectedSuccessRate %", String(signal.aiDetectedSuccessRate ?? "—")],
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
            {Array.isArray(signal.reasons) && signal.reasons.length > 0 ? (
              signal.reasons.map((r, i) => <div key={i}>• {r}</div>)
            ) : (
              <div className="text-slate-400">—</div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
        <div className="max-w-3xl w-full bg-slate-800/60 backdrop-blur rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Sign & Submit — Review</h2>

          {!payloadParam && (
            <div className="p-4 rounded bg-yellow-900/30 text-yellow-300">
              Missing <code>payload</code> query parameter.
            </div>
          )}

          {parsedWrapper && (parsedWrapper as any).__parseError && (
            <div className="p-4 rounded bg-red-900/40 text-red-300">
              Failed to parse payload. Raw: {(parsedWrapper as any).raw}
            </div>
          )}

          {summary && !("error" in summary) && (
            <div className="space-y-4">
              <section className="p-4 bg-slate-900/30 rounded">
                <h3 className="font-semibold mb-2">Request details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-slate-300 font-medium">
                      Wallet Address
                    </div>
                    <div className="text-slate-200 truncate">
                      {String(summary.wrapper.userAddress ?? "—").slice(0, 6)}
                      ...
                      {String(summary.wrapper.userAddress ?? "—").slice(-4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-300 font-medium">
                      Telegram User id
                    </div>
                    <div className="text-slate-200 truncate">
                      {String(summary.wrapper.telegramChatId ?? "—")}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-300 font-sm">Connector</div>
                    <div className="text-slate-200 break-words max-w-xs font-sm">
                      {String(summary.wrapper.connectorName ?? "—")}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-300 font-medium">Mainnet</div>
                    <div className="text-slate-200 truncate">
                      {String(summary.wrapper.mainnet ?? false)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="p-4 bg-slate-900/30 rounded">
                <h3 className="font-semibold mb-2">Global signal</h3>

                {/* scrollable signal box */}
                <div className="max-h-56 overflow-y-auto p-3 bg-slate-800/50 rounded">
                  {renderSignalGrid(summary.wrapper.signal)}
                  <div className="mt-3 border-t border-slate-700 pt-3">
                    <div className="text-slate-300 font-medium text-sm mb-2">
                      Raw signal JSON
                    </div>
                    <pre className="whitespace-pre-wrap text-xs text-slate-200">
                      {
                        stringifyJsonWithBigInt(
                          summary.wrapper.signal ?? {}
                        ).split('"text":')[0]
                      }
                    </pre>
                  </div>
                </div>
              </section>

              <section className="p-4 bg-slate-900/30 rounded">
                <h3 className="font-semibold mb-2">
                  {" "}
                  Full transaction payload
                </h3>
                {summary.txSummary && summary.txSummary.error ? (
                  <div className="text-red-300 text-sm">
                    {summary.txSummary.error}
                  </div>
                ) : (
                  <>
                    <details className="mt-2 p-3 bg-slate-900/20 rounded">
                      <pre className="whitespace-pre-wrap text-sm mt-2 overflow-auto">
                        {stringifyJsonWithBigInt(summary.txSummary.raw)}
                      </pre>
                    </details>
                  </>
                )}
              </section>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {!publicKeyHex! && (
              <div className="p-3 rounded bg-red-900/30 text-red-200">
                Missing Petra keys in localStorage. Please connect to Petra
                first (store <code>petra_public_key</code> and{" "}
                <code>petra_shared_key</code>).
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
                disabled={busy || !parsedWrapper || !publicKeyHex!}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold disabled:opacity-50"
              >
                {busy ? "Preparing..." : "Sign & Submit with Petra"}
              </button>

              <button
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-red-600 font-semibold disabled:opacity-50"
                onClick={() => {
                  const tg = (window as any).Telegram?.WebApp;
                  tg?.close?.();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}

function stringifyJsonWithBigInt(json: any): string {
  return JSON.stringify(json, (_, v) =>
    typeof v === "bigint" ? v.toString() : v
  );
}
