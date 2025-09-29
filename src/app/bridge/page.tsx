"use client";

import { randomBytes } from "crypto";
import React, { useEffect, useMemo, useState } from "react";
import crypto from "crypto";
/**
 * PetraHttpsToTelegramBridge
 * - Use this page as the HTTPS redirect target you provide to Petra in your /connect flow.
 * - Petra will redirect here with `response=approved` and `data=<base64>` query params.
 * - This component extracts the `data` value, optionally parses it for helpful fields,
 *   attaches the `data` (URL-encoded) to a Telegram `startapp` start_param and
 *   then redirects the user back to Telegram via a `tg://resolve` deep link.
 * - A fallback button is rendered: "Click here if you are not redirected automatically".
 *
 * Usage:
 *  - Deploy this component on an HTTPS URL and set that URL as the `redirectLink`
 *    in the Petra /connect payload.
 *  - Petra will call: https://yourdomain/bridge?response=approved&data=<base64>
 */

const TELEGRAM_DEEP_LINK_DOMAIN = "AITJR_BOT"; // replace with your bot's domain if needed
const TELEGRAM_APPNAME = "AI_TJR_APP"; // optional appname param used earlier in your flow

function safeAtob(input: string) {
  try {
    return atob(input);
  } catch (e) {
    return null;
  }
}

function prettyJSON(s: string | null) {
  if (!s) return "";
  try {
    const parsed = JSON.parse(s);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return s;
  }
}

export default function PetraHttpsToTelegramBridge() {
  const [autoRedirected, setAutoRedirected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataParam, setDataParam] = useState<string | null>(null);
  const [decodedDataText, setDecodedDataText] = useState<string | null>(null);
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);

  async function handleSetValue(value: string): Promise<string> {
    // SHA-256 hash of the value, truncated to `bytes`
    const hash = crypto.createHash("sha256").update(value).digest();
    const token = hash.slice(0, 12).toString("hex");
    console.log("token", token);
    console.log("value", value);
    await fetch(`/api/bridge/setValue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        value,
      }),
    });
    return token;
  }
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function run() {
      const params = new URL(window.location.href).searchParams;
      const response = params.get("response");
      const data = params.get("data");

      setDataParam(data);

      if (!data) {
        setError("Missing Petra `data` query parameter. Nothing to forward.");
        return;
      }

      const decoded = safeAtob(data);
      if (decoded) {
        setDecodedDataText(prettyJSON(decoded));
      }

      let callbackUserId: string | null = null;
      const possibleUserId =
        params.get("callbackUserId") ||
        params.get("userId") ||
        params.get("user_tg_id");
      if (possibleUserId) callbackUserId = possibleUserId;

      try {
        if (decoded) {
          const p = JSON.parse(decoded);
          callbackUserId =
            callbackUserId ||
            p.userId ||
            p.user_tg_id ||
            p.telegram_user_id ||
            null;
        }
      } catch {}

      // 🔑 wait for token to be created
      const token = await handleSetValue(String(data));

      const parts: string[] = [];
      if (callbackUserId) parts.push(`callbackUserId_${callbackUserId}`);
      parts.push(`token_${token}`);

      const startParam = parts.join("_");

      const tgUrl = `tg://resolve?domain=${encodeURIComponent(
        TELEGRAM_DEEP_LINK_DOMAIN
      )}&appname=${encodeURIComponent(
        TELEGRAM_APPNAME
      )}&startapp=${encodeURIComponent(startParam)}`;

      setTgDeepLink(tgUrl);

      setTimeout(() => {
        try {
          window.location.href = tgUrl;
          setAutoRedirected(true);
        } catch (e) {
          setError(String(e));
        }
      }, 800);
    }

    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
      <div className="max-w-3xl w-full bg-slate-800/60 backdrop-blur rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Petra → Telegram Bridge</h2>

        {error && (
          <div className="mb-3 p-3 rounded bg-red-900/30 text-red-200">
            {error}
          </div>
        )}

        <div className="mb-3 p-3 rounded bg-slate-900/20">
          <div className="text-slate-300 text-xs">Raw redirect URL</div>
          <div className="text-slate-200 text-sm break-words">
            {typeof window !== "undefined" ? window.location.href : ""}
          </div>
        </div>

        <div className="mb-3 p-3 rounded bg-slate-900/10">
          <div className="text-slate-300 text-xs">
            Petra `data` param (base64)
          </div>
          <div className="text-slate-200 text-sm break-words">
            {dataParam ?? "(missing)"}
          </div>
        </div>

        <div className="mb-3 p-3 rounded bg-slate-900/10">
          <div className="text-slate-300 text-xs">
            Decoded Petra `data` (JSON if parsable)
          </div>
          <pre className="text-slate-200 text-xs whitespace-pre-wrap">
            {decodedDataText ?? "(not decodable)"}
          </pre>
        </div>

        <div className="mb-4 p-3 rounded bg-slate-900/10">
          <div className="text-slate-300 text-xs">
            Telegram deep link prepared
          </div>
          <div className="text-slate-200 text-sm break-words">
            {tgDeepLink ?? "(not prepared yet)"}
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href={tgDeepLink ?? "#"}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold"
            onClick={(e) => {
              // allow default anchor behavior for mobile deep link
            }}
          >
            Click here if you are not redirected automatically
          </a>

          <button
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-red-600 font-semibold"
            onClick={() => {
              if (tgDeepLink) window.open(tgDeepLink);
            }}
          >
            Force redirect
          </button>
        </div>
      </div>
    </div>
  );
}
