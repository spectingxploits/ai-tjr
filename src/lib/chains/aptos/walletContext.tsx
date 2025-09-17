"use client";

import {
  AptosWalletAdapterProvider,
  Network,
  AvailableWallets,
} from "@aptos-labs/wallet-adapter-react";

export default function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Show the following wallets as options even when not already installed
  const optInWallets = ["Petra"];

  const dappInfo = {
    aptosConnect: {
      dappName: "My awesome dapp",
      dappImageURI: "https://example.com/my-awesome-dapp-image.png",
    },
    network: "mainnet" as Network,
  };
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={dappInfo}
      optInWallets={["Petra"] as AvailableWallets[]}
      onError={(error) => {
        console.error("Wallet error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
