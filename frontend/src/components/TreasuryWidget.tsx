"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, Zap } from "lucide-react";
import { useTreasury } from "@/hooks/useStatusApi";

/**
 * The Agent's Books — live P&L widget showing the autonomous earn→spend loop.
 *
 * When Stripe Skills is configured, this displays:
 * - Total earned from milestone verification fees (3% of released capital)
 * - Total spent on Kimi, fal.ai, KeeperHub, etc.
 * - Net profit/loss
 * - Current Stripe operating balance
 * - Recent transaction history
 *
 * When not configured, shows the estimated costs and a prompt to activate.
 *
 * This is the judge-facing proof that Weft is an agent-run company.
 */
export function TreasuryWidget() {
  const { data, isLoading, error } = useTreasury();

  const charges = useMemo(() => {
    if (!data?.recentCharges) return [];
    return [...data.recentCharges].sort((a, b) => b.created - a.created).slice(0, 8);
  }, [data]);

  if (isLoading) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0a0e1a 0%, #111827 100%)",
        border: "1px solid #1e293b",
        borderRadius: "16px",
        padding: "24px",
        color: "#94a3b8",
      }}>
        Loading agent treasury…
      </div>
    );
  }

  if (error || !data) {
    return null; // Don't show broken state — treasury is optional
  }

  // Not activated — show estimated costs
  if (!data.activated) {
    const costs = data.estimatedCosts || {};
    return (
      <div style={{
        background: "linear-gradient(135deg, #0a0e1a 0%, #111827 100%)",
        border: "1px solid #1e293b",
        borderRadius: "16px",
        padding: "28px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Wallet size={22} color="#6366f1" />
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#e2e8f0" }}>
            The Agent&apos;s Books
          </h3>
        </div>
        <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: "14px", lineHeight: 1.6 }}>
          When activated, the agent earns 3% of every milestone release and autonomously
          pays for the services it uses — a self-sustaining verification company.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {Object.entries(costs).map(([service, cost]) => (
            <div key={service} style={{
              background: "#1e293b",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              color: "#cbd5e1",
            }}>
              <span style={{ color: "#6366f1", fontWeight: 600 }}>{service}</span>
              {" ~$"}{cost.toFixed(2)}{"/call"}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Activated — show live P&L
  const earned = data.earned || 0;
  const spent = data.spent || 0;
  const net = data.net || 0;
  const profitable = data.profitable;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0e1a 0%, #111827 100%)",
      border: "1px solid #1e293b",
      borderRadius: "16px",
      padding: "28px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Wallet size={22} color="#6366f1" />
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#e2e8f0" }}>
            The Agent&apos;s Books
          </h3>
        </div>
        <span style={{
          fontSize: "11px",
          color: "#22c55e",
          background: "rgba(34,197,94,0.1)",
          padding: "4px 10px",
          borderRadius: "20px",
          fontWeight: 600,
          letterSpacing: "0.5px",
        }}>
          AUTONOMOUS
        </span>
      </div>

      {/* P&L Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Earned
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={16} color="#22c55e" />
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#22c55e" }}>
              ${earned.toFixed(2)}
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Spent
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingDown size={16} color="#ef4444" />
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#ef4444" }}>
              ${spent.toFixed(2)}
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Net P&L
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Zap size={16} color={profitable ? "#22c55e" : "#ef4444"} />
            <span style={{ fontSize: "24px", fontWeight: 700, color: profitable ? "#22c55e" : "#ef4444" }}>
              ${net.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Spend by service */}
      {data.spendByService && Object.keys(data.spendByService).length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Spend by Service
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(data.spendByService)
              .sort(([, a], [, b]) => b - a)
              .map(([service, amount]) => (
                <div key={service} style={{
                  background: "#1e293b",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "#cbd5e1",
                }}>
                  <span style={{ color: "#94a3b8" }}>{service}</span>
                  {"  $"}{amount.toFixed(2)}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Balance */}
      {data.balance && data.balance.available !== null && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "#0f172a",
          borderRadius: "8px",
          marginBottom: "16px",
        }}>
          <span style={{ color: "#64748b", fontSize: "13px" }}>Stripe Balance</span>
          <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "14px" }}>
            ${data.balance.available.toFixed(2)}
            {data.balance.pending && data.balance.pending > 0 ? (
              <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "8px" }}>
                + ${data.balance.pending.toFixed(2)} pending
              </span>
            ) : null}
          </span>
        </div>
      )}

      {/* Recent charges */}
      {charges.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Recent Transactions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {charges.map((c) => (
              <div key={c.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #1e293b",
                fontSize: "13px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    color: c.service === "revenue_sweep" ? "#22c55e" : "#94a3b8",
                    fontWeight: 600,
                    minWidth: "90px",
                  }}>
                    {c.service}
                  </span>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>
                    {c.memo}
                  </span>
                </div>
                <span style={{
                  color: c.service === "revenue_sweep" ? "#22c55e" : "#ef4444",
                  fontWeight: 600,
                }}>
                  {c.service === "revenue_sweep" ? "+" : "−"}${c.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
