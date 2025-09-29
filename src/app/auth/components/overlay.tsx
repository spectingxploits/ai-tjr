import Image from "next/image";

export default function Overlay() {
  return (
    <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-30">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl">
        <Image
          src="/greenTick.svg"
          alt="Connected"
          className="w-6 h-6 object-contain"
        />
        <span className="text-sm font-medium text-white whitespace-nowrap">
          Setup completed
        </span>
      </div>
    </div>
  );
}
