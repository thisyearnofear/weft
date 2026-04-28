"use client";

import { useConnect } from "wagmi";
import { useAccount, useDisconnect } from "wagmi";
import { X } from "lucide-react";
import styles from "./ConnectButton.module.css";

export function ConnectButton() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const metamask = connectors.find((c) => c.type === "injected");
  const walletConnect = connectors.find((c) => c.type === "walletConnect");

  if (isConnected) {
    return (
      <div className={styles.connected} aria-label="Wallet connected">
        <div className={styles.address}>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <button onClick={() => disconnect()} className={styles.disconnect} aria-label="Disconnect wallet">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {metamask && (
        <button
          onClick={() => connect({ connector: metamask })}
          disabled={isPending}
          className={styles.button}
          aria-label="Connect MetaMask"
        >
          {isPending ? "Connecting..." : "MetaMask"}
        </button>
      )}
      {walletConnect && !isPending && (
        <button
          onClick={() => connect({ connector: walletConnect })}
          className={styles.button}
          aria-label="Connect WalletConnect"
        >
          WalletConnect
        </button>
      )}
    </div>
  );
}
