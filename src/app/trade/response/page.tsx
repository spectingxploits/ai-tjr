"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Petra redirect handler (page)
 * - parses `response` and `data` query params
 * - if `data` present, base64-decodes and shows the object
 * - helpful UI for seeing tx hash returned by Petra
 */

function safeAtob(s: string) {
  try {
    return atob(s);
  } catch {
    // handle URL-encoded b64
    try {
      return atob(decodeURIComponent(s));
    } catch {
      return null;
    }
  }
}

export default function PetraResponsePage() {
  const params = useSearchParams();
  const response = params.get("response");
  const dataParam = params.get("data");
  const [decoded, setDecoded] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataParam) return;
    try {
      const decodedB64 = safeAtob(dataParam);
      if (!decodedB64) {
        setError("Failed to base64-decode Petra data param");
        return;
      }
      try {
        const obj = JSON.parse(decodedB64);
        setDecoded(obj);
      } catch {
        // try nested decode
        try {
          const nested = JSON.parse(atob(decodedB64));
          setDecoded(nested);
        } catch (e) {
          setDecoded(decodedB64);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [dataParam]);

  // try to find a tx hash in decoded object (common patterns)
  const txHash =
    typeof decoded === "object" && decoded !== null
      ? decoded.txHash ??
        decoded.transaction_hash ??
        decoded.hash ??
        decoded.tx_hash ??
        null
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
      <div className="max-w-2xl w-full bg-slate-800/60 backdrop-blur rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Petra Response</h2>

        <div className="mb-4">
          <strong>Response:</strong>{" "}
          <span className="text-slate-200">{response ?? "n/a"}</span>
        </div>

        {error && (
          <div className="p-3 rounded bg-red-900/30 text-red-200 mb-4">
            Error parsing data: {error}
          </div>
        )}

        <div className="mb-4 break-words">
          <strong>Raw data param:</strong>
          <pre className="mt-2 p-3 bg-slate-900/20 rounded text-sm ">
            {dataParam ?? "none"}
          </pre>
        </div>

        <div className="mb-4">
          <strong>Decoded data:</strong>
          <pre className="mt-2 p-3 bg-slate-900/20 rounded text-sm">
            {decoded ? JSON.stringify(decoded, null, 2) : "No data decoded"}
          </pre>
        </div>

        {txHash ? (
          <div className="p-3 rounded bg-green-900/30 text-green-200">
            ✅ Transaction hash:{" "}
            <code className="block mt-1">{String(txHash)}</code>
            <div className="mt-2 text-sm text-slate-300">
              You can inspect this hash on a block explorer.
            </div>
          </div>
        ) : (
          <div className="p-3 rounded bg-yellow-900/30 text-yellow-200">
            No transaction hash found in Petra response. Check the decoded data
            above.
          </div>
        )}

        <div className="mt-6">
          <a href="/" className="text-indigo-400 underline">
            Return home
          </a>
        </div>
      </div>
    </div>
  );
}
