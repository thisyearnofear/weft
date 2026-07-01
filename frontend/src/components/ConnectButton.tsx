"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import styles from "./ConnectButton.module.css";

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div className={!ready ? styles.wrapperHidden : undefined}>
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className={styles.connectBtn}
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={styles.wrongNetworkBtn}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className={styles.connectedRow}>
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={styles.chainBtn}
                  >
                    {chain.hasIcon && (
                      <div
                        className={styles.chainIconWrap}
                        style={{ background: chain.iconBackground }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            className={styles.chainIcon}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={styles.accountBtn}
                  >
                    {account.displayName}
                    {account.displayBalance && !account.displayBalance.startsWith("NaN")
                      ? ` (${account.displayBalance})`
                      : ""}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
