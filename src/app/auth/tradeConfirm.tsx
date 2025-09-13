// pages/confirm-trade.tsx
"use client";
import { useState } from "react";

export default function ConfirmTradePage({
  tradeRequestId,
  serverPublicKey,
}: any) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleConfirm = async () => {
    // Encrypt trading password with server public key
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const pubKey = await window.crypto.subtle.importKey(
      "spki",
      Uint8Array.from(atob(serverPublicKey), (c) => c.charCodeAt(0)),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      data
    );

    // Send to server
    const res = await fetch("/api/trade/confirm", {
      method: "POST",
      body: JSON.stringify({
        tradeRequestId,
        encryptedPassword: btoa(
          String.fromCharCode(...new Uint8Array(encrypted))
        ),
      }),
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    setStatus(json.ok ? "Trade executed!" : "Error: " + json.error);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-2">Confirm Trade</h1>
      <input
        type="password"
        placeholder="Enter trading password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded mb-2"
      />
      <button
        onClick={handleConfirm}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Confirm
      </button>
      {status && <p className="mt-2">{status}</p>}
    </div>
  );
}
