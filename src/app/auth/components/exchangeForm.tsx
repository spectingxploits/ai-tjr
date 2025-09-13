import Overlay from "./overlay";

interface Props {
  exchange: "kana" | "hyperion" | "merkle";
  form: any;
  setForm: any;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
  success: string | null;
  setView: (v: "home" | "form") => void;
  alreadyConnected: boolean;
  setAlreadyConnected: (v: boolean) => void;
  connectedMap: { [k: string]: boolean };
}

export default function ExchangeForm({
  exchange,
  form,
  setForm,
  handleSubmit,
  loading,
  error,
  success,
  setView,
  alreadyConnected,
  setAlreadyConnected,
  connectedMap,
}: Props) {
  return (
    <div className="relative">
      {(alreadyConnected || connectedMap[exchange]) && <Overlay />}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">
          {exchange === "kana" ? "Kana Labs" : exchange === "hyperion" ? "Hyperion" : "Merkle Trade"} setup
        </h2>
        <button className="text-sm text-slate-400 underline" onClick={() => setView("home")}>
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-xs text-slate-300">Already connected?</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAlreadyConnected(false)}
              className={`px-3 py-1 rounded-md ${!alreadyConnected ? "bg-white/6 text-white" : "bg-white/3 text-slate-300"}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setAlreadyConnected(true)}
              className={`px-3 py-1 rounded-md ${alreadyConnected ? "bg-emerald-600 text-white" : "bg-white/3 text-slate-300"}`}
            >
              Yes
            </button>
          </div>
        </div>

        {["API Key", "Secret Key", "Trading Password"].map((label, idx) => (
          <div key={idx}>
            <label className="block text-xs text-slate-300 mb-1">
              enter &lt;{label.toLowerCase()}&gt;
            </label>
            <input
              type={label === "Trading Password" ? "password" : "text"}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form[idx === 0 ? "apiKey" : idx === 1 ? "secretKey" : "tradingPassword"]}
              onChange={(e) =>
                setForm({ ...form, [idx === 0 ? "apiKey" : idx === 1 ? "secretKey" : "tradingPassword"]: e.target.value })
              }
              placeholder={label}
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <div className="flex items-center gap-3 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-60"
          >
            {loading ? "Saving..." : `Setup ${exchange === "kana" ? "Kana" : exchange === "hyperion" ? "Hyperion" : "Merkle"}`}
          </button>
          <button type="button" onClick={() => setView("home")} className="py-3 px-4 rounded-xl border border-slate-600 bg-slate-900 text-slate-300">
            Cancel
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          All secrets submitted here are encrypted. No plaintext secrets are stored.
        </p>
      </form>
    </div>
  );
}
