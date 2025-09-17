"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useRef, useState } from "react";
import nacl from "tweetnacl";
import { useSearchParams } from "next/navigation";

/**
 * Robust MiniAppPage
 * - polls for Telegram.WebApp (time-limited)
 * - uses a processedMap to avoid reprocessing the exact same start_param too often
 * - requires a valid Telegram user id for connect redirect (avoids empty callbackUserId_)
 * - uses parsed ids directly for DB calls
 */
export default function MiniAppPage() {
  const searchParams = useSearchParams();
  const [userTgId, setUserTgId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [isCallback, setIsCallback] = useState(false);
  const [petraConnected, setPetraConnected] = useState(false);

  const { disconnect } = useWallet();

  // map of start_param -> lastProcessedTimestamp (ms)
  const processedMapRef = useRef<Map<string, number>>(new Map());

  const APP_INFO = {
    domain: "https://3d8db094a821.ngrok-free.app/auth",
    name: "aitjr",
  };

  // -------------------- 1) Poll for Telegram.WebApp (safe, limited attempts) --------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    let attempts = 0;
    const intervalMs = 250;
    const maxAttempts = 40; // stop after ~10s
    let timer: ReturnType<typeof setInterval> | null = null;

    const onFound = (tg: any) => {
      try {
        tg.ready?.();
      } catch (e) {
        /* ignore */
      }

      // process initData start_param if provided by Telegram right away
      const initStart = tg.initDataUnsafe?.start_param;
      if (typeof initStart === "string") {
        handleStartParam(initStart, /*from=*/"initData");
      }

      // use initDataUnsafe.user if we don't yet have userTgId
      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser && !userTgId) {
        setUserTgId(String(tgUser.id));
      }

      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const check = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        onFound(tg);
        return;
      }
      attempts++;
      if (attempts >= maxAttempts && timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    check();
    timer = setInterval(check, intervalMs);

    return () => {
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // -------------------- 2) when userTgId available, fetch status once --------------------
  useEffect(() => {
    if (!userTgId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/getConnected?user_tg_id=${encodeURIComponent(userTgId)}`);
        if (!res.ok) {
          console.warn("getConnected non-ok:", res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setPetraConnected(Boolean(data.connected));
          setIsCallback(Boolean(data.connected));
        }
      } catch (err) {
        console.error("Failed to fetch connection status:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userTgId]);

  // -------------------- 3) process URL search params (or startapp from query) --------------------
  useEffect(() => {
    // prefer tgWebAppStartParam, then startapp (some clients use different names)
    const startParamFromUrl = searchParams.get("tgWebAppStartParam") || searchParams.get("startapp") || null;
    const userIdParam = searchParams.get("userId");

    if (userIdParam && !userTgId) {
      setUserTgId(userIdParam);
    }

    if (startParamFromUrl) {
      handleStartParam(startParamFromUrl, /*from=*/"url");
    }
    // intentionally only depend on searchParams (we don't want setting userTgId inside to re-trigger this)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // -------------------- helper to handle start_param safely --------------------
  function handleStartParam(startParam: string, from: "initData" | "url") {
    if (!startParam || typeof startParam !== "string") return;

    const now = Date.now();
    const last = processedMapRef.current.get(startParam) ?? 0;
    const minReprocessMs = 3000; // allow reprocessing after 3s (tunable)
    if (now - last < minReprocessMs) {
      // too recent — skip to avoid duplicate processing spam
      console.debug("Skipping startParam (recent):", startParam);
      return;
    }
    // record processing time
    processedMapRef.current.set(startParam, now);

    console.debug(`Processing startParam (from=${from}):`, startParam);

    if (startParam.startsWith("callbackUserId_")) {
      const callbackUserId = startParam.replace("callbackUserId_", "");
      if (!callbackUserId) {
        console.warn("startParam had empty user id — ignoring");
        return;
      }

      // update UI
      setUserTgId(callbackUserId);
      setIsCallback(true);
      setPetraConnected(true);

      // persist immediately with parsed id
      void fetch("/api/users/setConnected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_tg_id: callbackUserId, connected: true }),
      }).catch((e) => console.error("setConnected(connect) failed:", e));
      return;
    }

    if (startParam.startsWith("callbackDisUserId_")) {
      const disUserId = startParam.replace("callbackDisUserId_", "");
      if (!disUserId) {
        console.warn("disconnect startParam had empty user id — ignoring");
        return;
      }

      // update UI
      setIsCallback(false);
      setPetraConnected(false);
      setUserTgId(null);

      void fetch("/api/users/setConnected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_tg_id: disUserId, connected: false }),
      }).catch((e) => console.error("setConnected(disconnect) failed:", e));
      return;
    }

    // other start params ignored
  }

  // -------------------- keypair, connect & disconnect flows --------------------
  const generateAndSaveKeyPair = () => {
    const keyPair = nacl.box.keyPair();
    setSecretKey(Buffer.from(keyPair.secretKey).toString("hex"));
    setPublicKey(Buffer.from(keyPair.publicKey).toString("hex"));
    return keyPair;
  };

  // get a reliable telegram user id: prefer live tg.initDataUnsafe.user, fallback to userTgId state
  function getReliableTgUserId(): string | null {
    if (typeof window === "undefined") return userTgId;
    const tg = (window as any).Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
    return tgId ?? userTgId;
  }

  const connectMobile = async () => {
    // ensure we have a valid tg user id to include in redirect
    const reliableId = getReliableTgUserId();
    if (!reliableId) {
      // don't start the flow with an empty id — it causes callbackUserId_ (empty)
      alert("Could not detect Telegram user id. Please open via Telegram Mini App and try again.");
      return;
    }

    const keyPair = generateAndSaveKeyPair();
    const redirect = `tg://resolve?domain=AITJR_BOT&appname=AI_TJR_APP&startapp=callbackUserId_${reliableId}`;
    const data = {
      appInfo: APP_INFO,
      redirectLink: redirect,
      dappEncryptionPublicKey: Buffer.from(keyPair.publicKey).toString("hex"),
    };

    console.debug("Opening Petra connect with redirect:", redirect);
    window.open(`https://petra.app/api/v1/connect?data=${btoa(JSON.stringify(data))}`);

    // brief delay, then close the mini app view
    await new Promise((r) => setTimeout(r, 1500));
    const tg = (window as any).Telegram?.WebApp;
    tg?.close?.();
  };

  async function handleDisconnect() {
    try {
      const snapshotId = getReliableTgUserId();

      if (petraConnected) {
        const redirect = `tg://resolve?domain=AITJR_BOT&appname=AI_TJR_APP&startapp=callbackDisUserId_${snapshotId ?? ""}`;
        const data = {
          appInfo: APP_INFO,
          redirectLink: redirect,
          dappEncryptionPublicKey: Buffer.from(String(publicKey ?? "")).toString("hex"),
        };
        window.open(`https://petra.app/api/v1/disconnect?data=${btoa(JSON.stringify(data))}`);
      }

      // update DB using snapshot id (if present)
      if (snapshotId) {
        await fetch("/api/users/setConnected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_tg_id: snapshotId, connected: false }),
        }).catch(console.error);
      }

      // reset local UI state
      setIsCallback(false);
      setPetraConnected(false);
      setUserTgId(null);

      await new Promise((r) => setTimeout(r, 1500));
      const tg = (window as any).Telegram?.WebApp;
      tg?.close?.();
    } catch (err) {
      console.error("Wallet disconnection failed", err);
    }
  }

  // ---------- UI ----------
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black text-white p-6">
      <h1 className="text-4xl font-bold mb-6">AI TJR</h1>
      <p className="text-lg mb-6">Connect your Aptos Petra Wallet</p>

      {isCallback || petraConnected ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-green-400 text-lg font-semibold">✅ Your Petra Wallet is connected</p>
          <button
            onClick={handleDisconnect}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out active:scale-95"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <button
          onClick={connectMobile}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out active:scale-95"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}
