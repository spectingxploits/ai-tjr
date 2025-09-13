import Overlay from "./overlay";

interface Props {
  connectedMap: { [key: string]: boolean };
  openForm: (ex: "kana" | "hyperion" | "merkle") => void;
}

export default function ExchangeButtons({ connectedMap, openForm }: Props) {
  const exchanges = [
    {
      key: "kana",
      label: "setup kana labs credentials",
      style:
        "bg-gradient-to-br from-blue-900 to-blue-600 text-white hover:shadow-xl",
    },
    {
      key: "hyperion",
      label: "setup hyperion credentials",
      style:
        "bg-gradient-to-br from-gray-700 to-gray-500 text-white hover:shadow-xl",
    },
    {
      key: "merkle",
      label: "setup merkle trade credentials",
      style:
        "bg-gradient-to-br from-green-900 to-green-600 text-white hover:shadow-xl",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {exchanges.map((ex) => (
        <div className="relative" key={ex.key}>
          <button
            className={`w-full py-3 rounded-xl transition text-sm sm:text-base ${ex.style}`}
            onClick={() => openForm(ex.key as any)}
          >
            {ex.label}
          </button>
          {connectedMap[ex.key] && <Overlay />}
        </div>
      ))}
    </div>
  );
}
