"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";

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
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none" as const,
                userSelect: "none" as const,
              },
            })}
          >
            <style>{`
              @media (min-width: 640px) {
                .chain-btn { display: inline-flex !important; }
              }
            `}</style>
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "8px",
                      background: "#6366f1",
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#5558e6")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#6366f1")}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "8px",
                      background: "#ef4444",
                      padding: "8px 16px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={openChainModal}
                    type="button"
                    style={{
                      display: "none",
                      alignItems: "center",
                      gap: "6px",
                      borderRadius: "8px",
                      background: "#1a1a2e",
                      padding: "8px 12px",
                      fontSize: "14px",
                      color: "#a0aec0",
                      border: "none",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#252540")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#1a1a2e")}
                    className="chain-btn"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: chain.iconBackground,
                          flexShrink: 0,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: "16px", height: "16px" }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "8px",
                      background: "#1a1a2e",
                      padding: "8px 12px",
                      fontSize: "14px",
                      color: "#e8e8f2",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#252540")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#1a1a2e")}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
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