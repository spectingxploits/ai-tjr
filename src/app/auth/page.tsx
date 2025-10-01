"use client";

import {
  getAptosConnectWallets,
  useWallet,
} from "@aptos-labs/wallet-adapter-react";
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
  const [isCallback, setIsCallback] = useState(false);
  const [petraConnected, setPetraConnected] = useState(false);
  // add at the top of component
  const [walletAddress, setWalletAddress] = useState("");

  // validation function
  function validateAddress(addr: string): boolean {
    return /^0x[0-9a-fA-F]{1,64}$/.test(addr);
  }

  // map of start_param -> lastProcessedTimestamp (ms)
  const processedMapRef = useRef<Map<string, number>>(new Map());

  // -------------------- 1) Poll for Telegram.WebApp (safe, limited attempts) --------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    getAptosConnectWallets;
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
      const sharedPubKey = tg.initDataUnsafe?.shared_pubkey;
      if (typeof initStart === "string") {
        handleStartParam(initStart, /*from=*/ "initData");
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
        const res = await fetch(
          `/api/users/getConnected?user_tg_id=${encodeURIComponent(userTgId)}`
        );
        if (!res.ok) {
          console.warn("getConnected non-ok:", res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setPetraConnected(Boolean(data.connected));
          setIsCallback(Boolean(data.connected));
          setWalletAddress(data.wallet_address);
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
    // log the full redirect URL

    const startParamFromUrl =
      searchParams.get("tgWebAppStartParam") ||
      searchParams.get("startapp") ||
      null;

    const sharedPubKey = searchParams.get("shared_pubkey") || "";
    const userIdParam = searchParams.get("userId");

    if (userIdParam && !userTgId) {
      setUserTgId(userIdParam);
    }

    if (startParamFromUrl) {
      handleStartParam(startParamFromUrl, "url");
    }
  }, [searchParams]);

  // -------------------- helper to handle start_param safely --------------------
  async function handleStartParam(
    startParam: string,
    from: "initData" | "url"
  ) {
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
      const [userPart, token] = startParam.split("_token_");
      const callbackUserId = userPart.replace("callbackUserId_", "");

      if (!callbackUserId) {
        console.warn("startParam had empty user id — ignoring");
        return;
      }

      // fetching the bridge value
      let bridgeValue = await fetch(`/api/bridge/getValue?token=${token}`);
      if (!bridgeValue.ok) {
        console.warn("getConnected non-ok:", bridgeValue.status);
        return;
      }
      const data = await bridgeValue.json();
      console.log("data", data);
      // decoding the base64 petra data response
      const decoded = atob(data.value);
      console.log("decoded", decoded);
      const p = JSON.parse(decoded);
      console.log("p", p);

      setWalletAddress(p.address);

      // update UI
      setUserTgId(callbackUserId);
      setIsCallback(true);
      setPetraConnected(true);

      // preparing the shared key
      // persist immediately with parsed id
      void fetch("/api/users/setConnected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_tg_id: callbackUserId,
          connected: true,
          shared_pubkey: p.petraPublicEncryptedKey || "",
          wallet_address: p.address,
        }),
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

      let sec = await fetch("/api/users/setSec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_tg_id: disUserId,
          sec: "",
        }),
      });

      void fetch("/api/users/setConnected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_tg_id: disUserId,
          connected: false,
          shared_pubkey: "",
          wallet_address: "",
        }),
      }).catch((e) => console.error("setConnected(disconnect) failed:", e));
      return;
    }

    // other start params ignored
  }

  // -------------------- keypair, connect & disconnect flows --------------------
  const generateAndSaveKeyPair = () => {
    const keyPair = nacl.box.keyPair();
    setPublicKey(Buffer.from(keyPair.publicKey).toString("hex"));
    return keyPair;
  };

  // get a reliable telegram user id: prefer live tg.initDataUnsafe.user, fallback to userTgId state
  function getReliableTgUserId(): string | null {
    if (typeof window === "undefined") return userTgId;
    const tg = (window as any).Telegram?.WebApp;
    const tgId = tg?.initDataUnsafe?.user?.id
      ? String(tg.initDataUnsafe.user.id)
      : null;
    return tgId ?? userTgId;
  }

  // (inside your client component)
  const BRIDGE_URL = `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/bridge`;

  const connectMobile = async () => {
    const reliableId = getReliableTgUserId();
    if (!reliableId) {
      alert("Open via Telegram Mini App and try again.");
      return;
    }

    // generate ephemeral dapp keypair
    const keyPair = nacl.box.keyPair();
    const dappPubHex = Buffer.from(keyPair.publicKey).toString("hex");
    const dappSecretHex = Buffer.from(keyPair.secretKey).toString("hex");

    // build redirect -> point Petra to our HTTPS bridge (not tg://)
    const redirectLink = `${BRIDGE_URL}?callbackUserId=${encodeURIComponent(
      reliableId
    )}`;
    let res = await fetch("/api/users/setSec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_tg_id: reliableId,
        sec: encryptData(keyPair.secretKey),
      }),
    });

    if (!res.ok) {
      console.warn("setSec non-ok:", res.status);
      return;
    }

    let resPub = await fetch("/api/users/setPub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_tg_id: reliableId,
        pub: dappPubHex,
      }),
    });

    if (!resPub.ok) {
      console.warn("setPub non-ok:", resPub.status);
      return;
    }

    const data = {
      appInfo: {
        domain: `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/auth`,
        name: "AI_TJR",
      },
      redirectLink: redirectLink,
      dappEncryptionPublicKey: dappPubHex,
    };

    const url = `https://petra.app/api/v1/connect?data=${btoa(
      JSON.stringify(data)
    )}`;

    let os = getMobileOS();
    if (os === "iOS") {
      window.location.href = url;
      (window as any).tg.close();
    } else if (os === "Android") {
      window.open(url);
      (window as any).tg.close();
    }
  };

  async function handleDisconnect() {
    try {
      const snapshotId = getReliableTgUserId();

      if (petraConnected) {
        const redirect = `tg://resolve?domain=AITJR_BOT&appname=AI_TJR_APP&startapp=callbackDisUserId_${
          snapshotId ?? ""
        }`;
        const data = {
          appInfo: {
            domain: `${process.env.NEXT_PUBLIC_MINI_APP_BASE_URL}/auth`,
            name: "AI_TJR",
          },
          redirectLink: redirect,
          dappEncryptionPublicKey: Buffer.from(
            String(publicKey ?? "")
          ).toString("hex"),
        };
        let os = getMobileOS();
        if (os === "iOS") {
          window.location.href = `https://petra.app/api/v1/disconnect?data=${btoa(
            JSON.stringify(data)
          )}`;
          (window as any).tg.close();
        } else if (os === "Android") {
          window.open(
            `https://petra.app/api/v1/disconnect?data=${btoa(
              JSON.stringify(data)
            )}`
          );
          (window as any).tg.close();
        }
      }

      // update DB using snapshot id (if present)
      if (snapshotId) {
        await fetch("/api/users/setConnected", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_tg_id: snapshotId,
            connected: false,
            wallet_address: "",
            shared_pubkey: "",
          }),
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
      {isCallback || petraConnected ? (
        <>
          <p className="text-white-400 text-lg font-semibold items-center">
            Wallet is connected
          </p>
          <p className="text-green-400 text-lg font-semibold">
            {walletAddress ? walletAddress.slice(0, 6) : "address "}...
            {walletAddress ? walletAddress.slice(-4) : "not found !"}
          </p>
          <br />
        </>
      ) : (
        <>
          {" "}
          <p className="text-white-400 text-lg font-semibold">
            Connect your Aptos Petra Wallet
          </p>
          <br />
        </>
      )}

      {isCallback || petraConnected ? (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleDisconnect}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out active:scale-95"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          {/* Wallet address input */}
          {/* <input
            type="text"
            value={walletAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="Enter your Aptos wallet address (0x...)"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 focus:border-indigo-400 outline-none text-white"
          /> */}

          {/* Connect button (disabled until valid address) */}
          <button
            onClick={connectMobile}
            // disabled={!isValidAddress}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-50"
          >
            Connect Wallet
          </button>

          {/* Note
          <p className="text-xs text-slate-400 text-center">
            The wallet address you enter must be the same as the active address
            in your Petra wallet. You cannot continue without entering a valid
            Aptos address.
          </p> */}
        </div>
      )}
    </div>
  );
}

/**
 * Encrypt raw secretKeyBytes (Uint8Array, 32 bytes) for recipientPubHex (admin public).
 * Returns base64url(payload) where payload = ephemeralPub(32) || nonce(24) || ciphertext
 */
export function encryptData(
  secretKeyBytes: Uint8Array // 32 bytes (nacl key)
): string {
  const adminPublicHex = process.env.NEXT_PUBLIC_ADMIN_KEY!;
  if (!adminPublicHex) {
    throw new Error("NEXT_PUBLIC_ADMIN_KEY not set");
  }
  if (!(secretKeyBytes instanceof Uint8Array)) {
    throw new Error("secretKeyBytes must be Uint8Array");
  }
  if (secretKeyBytes.length !== 32) {
    throw new Error("secretKeyBytes must be 32 bytes");
  }

  const recipientPub = hexToU8(adminPublicHex);
  if (recipientPub.length !== 32) {
    throw new Error("adminPublicHex must be 32 bytes hex");
  }

  // ephemeral keypair for this message
  const eph = nacl.box.keyPair(); // publicKey, secretKey Uint8Array(32)
  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes

  // encrypt the raw secret bytes
  const ciphertext = nacl.box(
    secretKeyBytes,
    nonce,
    recipientPub,
    eph.secretKey
  );

  // pack ephemeralPub || nonce || ciphertext
  const combined = new Uint8Array(
    eph.publicKey.length + nonce.length + ciphertext.length
  );
  combined.set(eph.publicKey, 0);
  combined.set(nonce, eph.publicKey.length);
  combined.set(ciphertext, eph.publicKey.length + nonce.length);

  // return base64url for safe transport in query/body
  return u8ToBase64Url(combined);
}

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

function getMobileOS(): "iOS" | "Android" | "Other" {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;

  if (/android/i.test(ua)) {
    return "Android";
  }
  // iOS detection (iPhone, iPad, iPod)
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return "iOS";
  }
  return "Other";
}
