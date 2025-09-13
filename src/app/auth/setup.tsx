"use client";

import { useEffect, useState } from "react";
import Header from "./components/header";
import ImportantNote from "./components/importantNotes";
import ExchangeButtons from "./components/exchangeButtons";
import ExchangeForm from "./components/exchangeForm";

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
    try {
      const res = await fetch("/api/miniapp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, initData }),
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
              exchange={exchange}
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
