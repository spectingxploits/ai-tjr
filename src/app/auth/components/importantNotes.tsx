export default function ImportantNote() {
  return (
    <div className="mb-6 rounded-lg border border-yellow-400 bg-yellow-100 p-4 text-black">
      <strong className="block text-sm sm:text-base">Important</strong>
      <p className="text-xs sm:text-sm mt-1">
        No data is saved in plaintext. All secrets are encrypted client-side before being sent to the server.
        Your secrets are stored encrypted and only used to configure the bot. <br />
        <span className="font-bold">TJR bot cannot do anything without your permission.</span>
      </p>
    </div>
  );
}
