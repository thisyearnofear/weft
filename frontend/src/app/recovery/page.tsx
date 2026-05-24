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

const FAULT_DESCRIPTIONS: Record<string, string> = {
  kill_rpc: "Sever the blockchain connection",
  kill_peer: "Drop a verifier node from the mesh",
  kill_kimi: "Revoke the narrative AI key",
  kill_keeperhub: "Crash the execution service",
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

const EVENT_DESCRIPTIONS: Record<string, string> = {
  rpc_timeout: "Primary blockchain RPC is unreachable",
  rpc_fallback: "Switched to fallback RPC endpoint",
  peer_offline: "Verifier peer node is not responding",
  peer_reroute: "Rerouted consensus through remaining peers",
  kimi_unavailable: "Narrative AI service is down",
  kimi_cache_hit: "Serving cached narrative instead",
  keeperhub_503: "Execution service returned 503",
  keeperhub_retry: "Retried execution with backoff",
  verdict_submitted: "Onchain verdict confirmed",
  verification_started: "Verification pipeline initiated",
  evidence_collected: "Deterministic evidence gathered",
  narrative_generated: "AI narrative synthesized",
  chaos_injected: "Fault injected into system",
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

type DemoPhase = "idle" | "injecting" | "verifying" | "complete";

export default function RecoveryPage() {
  const [data, setData] = useState<RecoveryResponse | null>(null);
  const [polling, setPolling] = useState(true);
  const [phase, setPhase] = useState<DemoPhase>("idle");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const fetchRecovery = useCallback(async () => {
    try {
      const res = await fetch(`/api/recovery?since=0`);
      if (res.ok) {
        const json: RecoveryResponse = await res.json();
        setData(json);
        if (json.summary.verdictLanded && phase === "verifying") {
          setPhase("complete");
        }
      }
    } catch {
      // Status API unavailable
    }
  }, [phase]);

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

  const runFullDemo = async () => {
    // Reset everything
    setPhase("injecting");
    setData(null);
    await fetch("/api/chaos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", fault: "all" }),
    });

    // Small pause for dramatic effect, then inject all faults
    await new Promise(r => setTimeout(r, 800));
    await fetch("/api/chaos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "inject", fault: "kill_all" }),
    });
    await fetchRecovery();

    // Start verification after a beat
    await new Promise(r => setTimeout(r, 1200));
    setPhase("verifying");
    await fetch("/api/chaos/verify", { method: "POST" });
  };

  const resetDemo = async () => {
    await fetch("/api/chaos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear", fault: "all" }),
    });
    setData(null);
    setPhase("idle");
  };

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

  const summary = data?.summary ?? { totalEvents: 0, failures: 0, recoveries: 0, verdictLanded: false };
  const activeFaults = data?.chaos?.active ?? [];

  return (
    <div className={styles.container}>
      {/* ── Hero Context ── */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>Recovery Track</div>
          <h1 className={styles.heroTitle}>
            Break everything.
            <br />
            <span className={styles.heroAccent}>Watch it recover.</span>
          </h1>
          <p className={styles.heroDescription}>
            This agent verifies onchain milestones across 4 infrastructure layers.
            Inject simultaneous failures into all of them — RPC, peers, AI, execution —
            and watch the agent autonomously recover and deliver a correct verdict anyway.
          </p>
          {phase === "idle" && (
            <button className={styles.heroButton} onClick={runFullDemo}>
              Run The Demo
            </button>
          )}
          {phase === "injecting" && (
            <div className={styles.phaseIndicator}>
              <span className={styles.phaseDot} />
              Injecting failures...
            </div>
          )}
          {phase === "verifying" && (
            <div className={styles.phaseIndicator}>
              <span className={`${styles.phaseDot} ${styles.phaseDotActive}`} />
              Verification running — watch the timeline
            </div>
          )}
          {phase === "complete" && (
            <div className={styles.completeBlock}>
              <div className={styles.completeMessage}>
                Verdict landed despite 4 simultaneous infrastructure failures.
              </div>
              <button className={styles.resetButton} onClick={resetDemo}>
                Run Again
              </button>
            </div>
          )}
        </div>
        <div className={styles.heroStats}>
          <div className={`${styles.heroStat} ${summary.verdictLanded ? styles.heroStatGlow : ""}`}>
            <span className={styles.heroStatValue}>{summary.recoveries}</span>
            <span className={styles.heroStatLabel}>Recoveries</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatValue}>{activeFaults.length}</span>
            <span className={styles.heroStatLabel}>Active Faults</span>
          </div>
          <div className={`${styles.heroStat} ${summary.verdictLanded ? styles.heroStatSuccess : ""}`}>
            <span className={styles.heroStatValue}>{summary.verdictLanded ? "Yes" : "—"}</span>
            <span className={styles.heroStatLabel}>Verdict Landed</span>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className={styles.layout}>
        {/* ── Timeline ── */}
        <div className={styles.timeline} ref={timelineRef}>
          <div className={styles.timelineHeader}>
            <span>Recovery Event Timeline</span>
            {summary.totalEvents > 0 && (
              <span className={styles.timelineCount}>{summary.totalEvents} events</span>
            )}
          </div>
          {(!data || data.events.length === 0) ? (
            <div className={styles.emptyTimeline}>
              {phase === "idle" ? (
                <>
                  <div className={styles.emptyIcon}>&#9670;</div>
                  <div className={styles.emptyTitle}>Ready for chaos</div>
                  <div className={styles.emptyBody}>
                    Click &quot;Run The Demo&quot; above to inject failures and watch the agent recover in real-time.
                  </div>
                </>
              ) : (
                <div className={styles.emptyBody}>Waiting for events...</div>
              )}
            </div>
          ) : (
            data.events.map((ev, i) => (
              <div
                key={`${ev.timestamp}-${i}`}
                className={`${styles.event} ${ev.event === "verdict_submitted" ? styles.eventHighlight : ""}`}
              >
                <div className={`${styles.eventDot} ${dotClass(ev.outcome)}`} />
                <div className={styles.eventBody}>
                  <div className={styles.eventType}>{EVENT_LABELS[ev.event] || ev.event}</div>
                  <div className={styles.eventAction}>
                    {EVENT_DESCRIPTIONS[ev.event] || ev.action}
                    {ev.target ? ` → ${ev.target}` : ""}
                  </div>
                </div>
                <div className={styles.eventMeta}>
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
          {/* Verdict Banner */}
          {summary.verdictLanded && (
            <div className={`${styles.verdictBanner} ${styles.verdictLanded}`}>
              <div className={styles.verdictIcon}>&#10003;</div>
              <div>
                <div className={styles.verdictTitle}>Verdict Landed Onchain</div>
                <div className={styles.verdictSub}>
                  {summary.recoveries} autonomous recoveries
                </div>
              </div>
            </div>
          )}

          {/* Architecture */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Infrastructure Layers</div>
            <div className={styles.layerList}>
              <div className={`${styles.layer} ${activeFaults.includes("kill_rpc") ? styles.layerFault : ""}`}>
                <span className={styles.layerDot} />
                <div>
                  <div className={styles.layerName}>0G Chain RPC</div>
                  <div className={styles.layerRole}>Blockchain reads</div>
                </div>
              </div>
              <div className={`${styles.layer} ${activeFaults.includes("kill_peer") ? styles.layerFault : ""}`}>
                <span className={styles.layerDot} />
                <div>
                  <div className={styles.layerName}>AXL P2P Mesh</div>
                  <div className={styles.layerRole}>Peer consensus</div>
                </div>
              </div>
              <div className={`${styles.layer} ${activeFaults.includes("kill_kimi") ? styles.layerFault : ""}`}>
                <span className={styles.layerDot} />
                <div>
                  <div className={styles.layerName}>Kimi AI</div>
                  <div className={styles.layerRole}>Narrative generation</div>
                </div>
              </div>
              <div className={`${styles.layer} ${activeFaults.includes("kill_keeperhub") ? styles.layerFault : ""}`}>
                <span className={styles.layerDot} />
                <div>
                  <div className={styles.layerName}>KeeperHub</div>
                  <div className={styles.layerRole}>Onchain execution</div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Controls (collapsed by default) */}
          <button
            className={styles.advancedToggle}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide" : "Show"} manual controls
          </button>
          {showAdvanced && (
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Manual Chaos Injection</div>
              <div className={styles.chaosGrid}>
                {Object.entries(FAULT_LABELS).map(([fault, label]) => (
                  <button
                    key={fault}
                    className={`${styles.chaosBtn} ${activeFaults.includes(fault) ? styles.chaosBtnActive : ""}`}
                    onClick={() => injectChaos(fault)}
                    title={FAULT_DESCRIPTIONS[fault]}
                  >
                    {label}
                    {activeFaults.includes(fault) && " ●"}
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
                <button className={styles.clearBtn} onClick={resetDemo}>
                  Reset Demo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
