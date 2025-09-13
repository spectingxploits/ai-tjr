"use client";

import { useEffect, useState } from "react";
import Header from "./components/header";
import ImportantNote from "./components/importantNotes";
import ExchangeButtons from "./components/exchangeButtons";
import ExchangeForm from "./components/exchangeForm";
import { getAdminPublicKey } from "@/middleware/vault";
import * as crypto from "crypto";
export default function MiniAppPage() {
  const [tg, setTg] = useState<any>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [view, setView] = useState<"home" | "form">("home");
  const [exchange, setExchange] = useState<"" | "kana" | "hyperion" | "merkle">(
    ""
  );
  const [form, setForm] = useState({
    apiKey: "",
    secretKey: "",
    tradingPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [connectedMap, setConnectedMap] = useState<{ [k: string]: boolean }>({
    kana: true,
    hyperion: false,
    merkle: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram) {
      const WebApp = (window as any).Telegram.WebApp;
      setTg(WebApp);
      setInitData(WebApp?.initData || null);
    }
    try {
      const raw = localStorage.getItem("tjr_connected_map");
      if (raw) setConnectedMap(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("tjr_connected_map", JSON.stringify(connectedMap));
    } catch {}
  }, [connectedMap]);

  function openForm(which: "kana" | "hyperion" | "merkle") {
    setExchange(which);
    setForm({ apiKey: "", secretKey: "", tradingPassword: "" });
    setAlreadyConnected(false);
    setError(null);
    setSuccess(null);
    setView("form");
    try {
      (window as any).Telegram?.WebApp?.expand?.();
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.apiKey || !form.secretKey || !form.tradingPassword) {
      setError("Please fill all fields.");
      return;
    }
    const payload = {
      exchange:
        exchange === "kana"
          ? "Kana Labs"
          : exchange === "hyperion"
          ? "Hyperion"
          : "Merkle Trade",
      apiKey: form.apiKey,
      secretKey: form.secretKey,
      tradingPassword: form.tradingPassword,
      timestamp: new Date().toISOString(),
    };
    setLoading(true);
    setError(null);

    // here we have the data to encrypt

    // first we get the admins public key
    const serverPubKey = await getAdminPublicKey();

    // now we generate a keypair for the user and encrypt the credentials
    const userKeyPair = generateRSAKeyPair();

    // encrypt the user conditionals using its trading password and its public key
    const encryptedData = encryptCredentials(
      { apiKey: payload.apiKey, secretKey: payload.secretKey },
      userKeyPair.publicKey,
      payload.tradingPassword
    );

    // encrypt the user private key using the admin public key and the trading password
    const encryptedUserPrivKey = encryptUsersPrivKey(
      userKeyPair.privateKey,
      serverPubKey,
      payload.tradingPassword
    );

    try {
      const res = await fetch("/api/trade/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PrivEnc: encryptedUserPrivKey.encryptedKey,
          credsEnc: encryptedData.encryptedData,
          exchange: exchange,
          userTgNumericId: tg.id,
        }),
      });
      const json = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(json?.error || "Server error");
        return;
      }
      setSuccess("Settings saved (encrypted). The bot will confirm shortly.");
      setConnectedMap((m) => ({ ...m, [exchange]: true }));
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Network error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-black p-4">
      <div className="w-full max-w-xl relative bg-slate-800 shadow-2xl rounded-2xl overflow-hidden">
        <Header />
        <div className="p-6 sm:p-8 relative">
          <ImportantNote />

          {view === "home" ? (
            <ExchangeButtons connectedMap={connectedMap} openForm={openForm} />
          ) : (
            <ExchangeForm
              exchange={exchange as "kana" | "hyperion" | "merkle"}
              form={form}
              setForm={setForm}
              handleSubmit={handleSubmit}
              loading={loading}
              error={error}
              success={success}
              setView={setView}
              alreadyConnected={alreadyConnected}
              setAlreadyConnected={setAlreadyConnected}
              connectedMap={connectedMap}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export interface Credentials {
  apiKey: string;
  secretKey: string;
}

// Generate a random RSA key pair (2048-bit)
export function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

export function encryptCredentials(
  creds: Credentials,
  userPublicKey: string,
  tradingPassword: string
) {
  // 1️⃣ Generate random AES key
  const aesKey = crypto.randomBytes(32);

  // 2️⃣ Derive IV from trading password
  const iv = crypto
    .createHash("sha256")
    .update(tradingPassword)
    .digest()
    .slice(0, 12);

  // 3️⃣ AES-GCM encrypt the credentials
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const encryptedData = Buffer.concat([
    cipher.update(JSON.stringify(creds), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // 4️⃣ Encrypt the AES key with user's public key
  const encryptedKey = crypto.publicEncrypt(
    {
      key: userPublicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );

  return {
    encryptedData: Buffer.concat([authTag, encryptedData]).toString("base64"),
    encryptedKey: encryptedKey.toString("base64"),
  };
}

export function encryptUsersPrivKey(
  userPrvKey: string,
  adminPubKey: string,
  tradingPassword: string
): { encryptedKey: string; encryptedData: string } {
  // 1️⃣ Generate random AES key
  const aesKey = crypto.randomBytes(32);

  // 2️⃣ Derive IV from trading password (12 bytes for AES-GCM)
  const iv = crypto
    .createHash("sha256")
    .update(tradingPassword)
    .digest()
    .slice(0, 12);

  // 3️⃣ Encrypt user private key using AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const encryptedPrvKey = Buffer.concat([
    cipher.update(userPrvKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const aesEncryptedBlob = Buffer.concat([authTag, encryptedPrvKey]).toString(
    "base64"
  );

  // 4️⃣ Encrypt AES key using admin RSA public key
  const encryptedKey = crypto
    .publicEncrypt(
      {
        key: adminPubKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      aesKey
    )
    .toString("base64");

  return { encryptedKey, encryptedData: aesEncryptedBlob };
}
