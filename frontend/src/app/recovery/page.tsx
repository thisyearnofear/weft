"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

interface RecoveryEvent {
  timestamp: number;
  event: string;
  context: Record<string, unknown>;
  action: string;
  target: string;
  outcome: "success" | "degraded" | "failed" | "pending";
  latency_ms: number;
}

interface RecoverySummary {
  totalEvents: number;
  failures: number;
  recoveries: number;
  verdictLanded: boolean;
}

interface RecoveryResponse {
  ok: boolean;
  events: RecoveryEvent[];
  summary: RecoverySummary;
  chaos: { active: string[]; activatedAt: Record<string, number> };
}

const FAULT_LABELS: Record<string, string> = {
  kill_rpc: "Kill RPC",
  kill_peer: "Kill Peer",
  kill_kimi: "Kill Kimi",
  kill_keeperhub: "Kill KeeperHub",
};

const EVENT_LABELS: Record<string, string> = {
  rpc_timeout: "RPC Timeout",
  rpc_fallback: "RPC Fallback",
  peer_offline: "Peer Offline",
  peer_reroute: "Peer Reroute",
  kimi_unavailable: "Kimi Unavailable",
  kimi_cache_hit: "Kimi Cache Hit",
  keeperhub_503: "KeeperHub 503",
  keeperhub_retry: "KeeperHub Retry",
  keeperhub_confirmed: "KeeperHub Confirmed",
  consensus_degraded: "Consensus Degraded",
  consensus_recovered: "Consensus Recovered",
  verdict_submitted: "Verdict Submitted",
  verification_started: "Verification Started",
  evidence_collected: "Evidence Collected",
  narrative_generated: "Narrative Generated",
  chaos_injected: "Chaos Injected",
};

function dotClass(outcome: string): string {
  switch (outcome) {
    case "success": return styles.dotSuccess;
    case "degraded": return styles.dotDegraded;
    case "failed": return styles.dotFailed;
    default: return styles.dotPending;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function RecoveryPage() {
  const [data, setData] = useState<RecoveryResponse | null>(null);
  const [polling, setPolling] = useState(true);
  const lastTimestamp = useRef(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const fetchRecovery = useCallback(async () => {
    try {
      const res = await fetch(`/api/recovery?since=0`);
      if (res.ok) {
        const json: RecoveryResponse = await res.json();
        setData(json);
        if (json.events.length > 0) {
          lastTimestamp.current = json.events[json.events.length - 1].timestamp;
        }
      }
    } catch {
      // Status API unavailable — keep polling
    }
  }, []);

  useEffect(() => {
    if (!polling) return;
    fetchRecovery();
    const id = setInterval(fetchRecovery, 1000);
    return () => clearInterval(id);
  }, [polling, fetchRecovery]);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [data?.events.length]);

  const injectChaos = async (fault: string) => {
    await fetch("/api/chaos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "inject", fault }),
    });
    fetchRecovery();
  };

  const clearChaos = async () => {
    await fetch("/api/chaos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", fault: "all" }),
    });
    fetchRecovery();
  };

  const startVerification = async () => {
    // Clear previous events, clear faults, then start fresh
    await fetch("/api/chaos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", fault: "all" }),
    });
    setData(null);
    await fetch("/api/chaos/verify", { method: "POST" });
    fetchRecovery();
  };

  const summary = data?.summary ?? { totalEvents: 0, failures: 0, recoveries: 0, verdictLanded: false };
  const activeFaults = data?.chaos?.active ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Recovery Dashboard</h1>
          <p className={styles.subtitle}>
            Agents Under Pressure — live failure injection and autonomous recovery
          </p>
        </div>
        <div>
          <button
            onClick={() => setPolling(!polling)}
            className={styles.clearBtn}
            style={{ opacity: polling ? 1 : 0.5 }}
          >
            {polling ? "Polling" : "Paused"}
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Timeline ── */}
        <div className={styles.timeline} ref={timelineRef}>
          <div className={styles.timelineHeader}>Recovery Event Timeline</div>
          {(!data || data.events.length === 0) ? (
            <div className={styles.emptyTimeline}>
              No events yet. Trigger chaos or start a verification to see recovery in action.
            </div>
          ) : (
            data.events.map((ev, i) => (
              <div key={i} className={styles.event}>
                <div className={`${styles.eventDot} ${dotClass(ev.outcome)}`} />
                <div className={styles.eventBody}>
                  <div className={styles.eventType}>{EVENT_LABELS[ev.event] || ev.event}</div>
                  <div className={styles.eventAction}>
                    {ev.action}{ev.target ? ` → ${ev.target}` : ""}
                  </div>
                </div>
                <div>
                  <div className={styles.eventTime}>{formatTime(ev.timestamp)}</div>
                  {ev.latency_ms > 0 && (
                    <div className={styles.eventLatency}>{ev.latency_ms}ms</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className={styles.sidebar}>
          {/* Verdict Status */}
          <div className={summary.verdictLanded ? `${styles.verdictBanner} ${styles.verdictLanded}` : `${styles.verdictBanner} ${styles.verdictPending}`}>
            {summary.verdictLanded ? "Verdict Landed Onchain" : "Verdict Pending"}
          </div>

          {/* Start Verification */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Verification</div>
            <button className={styles.clearBtn} onClick={startVerification} style={{ width: "100%" }}>
              Start Demo Verification
            </button>
          </div>

          {/* Summary Stats */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Recovery Summary</div>
            <div className={styles.stats}>
              <div className={`${styles.stat} ${styles.statBlue}`}>
                <span className={styles.statValue}>{summary.totalEvents}</span>
                <span className={styles.statLabel}>Events</span>
              </div>
              <div className={`${styles.stat} ${styles.statRed}`}>
                <span className={styles.statValue}>{summary.failures}</span>
                <span className={styles.statLabel}>Failures</span>
              </div>
              <div className={`${styles.stat} ${styles.statGreen}`}>
                <span className={styles.statValue}>{summary.recoveries}</span>
                <span className={styles.statLabel}>Recoveries</span>
              </div>
              <div className={`${styles.stat} ${styles.statYellow}`}>
                <span className={styles.statValue}>{activeFaults.length}</span>
                <span className={styles.statLabel}>Active Faults</span>
              </div>
            </div>
          </div>

          {/* Chaos Controls */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Chaos Injection</div>
            <div className={styles.chaosGrid}>
              {Object.entries(FAULT_LABELS).map(([fault, label]) => (
                <button
                  key={fault}
                  className={`${styles.chaosBtn} ${activeFaults.includes(fault) ? styles.chaosBtnActive : ""}`}
                  onClick={() => injectChaos(fault)}
                >
                  {label}
                  {activeFaults.includes(fault) && " (active)"}
                </button>
              ))}
              <button
                className={`${styles.chaosBtn} ${styles.killAllBtn}`}
                onClick={() => injectChaos("kill_all")}
              >
                Kill All
              </button>
              <button className={styles.clearBtn} onClick={clearChaos}>
                Clear All Faults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
