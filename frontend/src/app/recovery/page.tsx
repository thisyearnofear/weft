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
  insights?: string;
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

const NARRATOR_MESSAGES: Record<string, string> = {
  idle: "The agent is idle, monitoring infrastructure. Click \"Run The Demo\" to begin.",
  injecting: "Injecting simultaneous failures across all 4 infrastructure layers...",
  verifying: "The agent is attempting to verify a milestone while under pressure. Watch the timeline.",
  complete: "The agent recovered from every failure and delivered a correct onchain verdict.",
  rpc_timeout: "The primary RPC endpoint is unreachable. The agent will attempt a fallback...",
  rpc_fallback: "Fallback RPC connected successfully. Blockchain reads have resumed.",
  peer_offline: "A verifier peer has dropped from the mesh. Rerouting consensus...",
  peer_reroute: "Consensus rerouted through remaining peers. The mesh is healing.",
  kimi_unavailable: "The narrative AI is unresponsive. The agent will serve from cache.",
  kimi_cache_hit: "Cached narrative served. The agent degraded gracefully instead of crashing.",
  keeperhub_503: "The execution service is down. The agent will retry with backoff...",
  keeperhub_retry: "Retry succeeded. The onchain transaction is being submitted.",
  keeperhub_confirmed: "Onchain execution confirmed by KeeperHub.",
  verdict_submitted: "The verdict has landed onchain. Despite every failure, the agent succeeded.",
  verification_started: "Beginning milestone verification. Collecting evidence...",
  evidence_collected: "Evidence collected from onchain and offchain sources.",
  narrative_generated: "AI narrative synthesized for the milestone story.",
  chaos_injected: "Chaos injected. All 4 layers are now compromised.",
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const shareDemo = async () => {
    const text = "Built @weft — an autonomous verifier agent that treats infrastructure failure as a routing problem, not a crash. Kill RPC. Kill peers. Kill AI. Kill execution. Verdict still lands. Demo: weft.thisyearnofear.com/recovery #AgentsUnderPressure #BuildYourOwnOS";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

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

  useEffect(() => {
    if (phase === "complete") {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 4000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" && phase === "idle") {
        e.preventDefault();
        runFullDemo();
      }
      if (e.code === "KeyR" && (phase === "complete" || phase === "idle")) {
        e.preventDefault();
        resetDemo();
      }
      if (e.code === "KeyC" && phase !== "verifying") {
        e.preventDefault();
        clearChaos();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

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

  const latestEvent = data && data.events.length > 0 ? data.events[data.events.length - 1] : null;
  const narratorMessage = latestEvent
    ? (NARRATOR_MESSAGES[latestEvent.event] ?? NARRATOR_MESSAGES[phase] ?? "")
    : NARRATOR_MESSAGES[phase];

  return (
    <div className={styles.container} data-theme={theme}>
      {/* ── Weaving Background ── */}
      <div className={styles.weaveBg} aria-hidden="true">
        <div className={styles.weaveLine} />
        <div className={styles.weaveLine} />
        <div className={styles.weaveLine} />
        <div className={styles.weaveLine} />
        <div className={styles.weaveLine} />
      </div>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>

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
            <div className={styles.heroActions}>
              <button className={styles.heroButton} onClick={runFullDemo}>
                Run The Demo
                <span className={styles.keyHint}>Space</span>
              </button>
              <button className={styles.shareButton} onClick={shareDemo}>
                {copied ? "Copied!" : "Share Demo"}
              </button>
            </div>
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
                <span className={styles.keyHint}>R</span>
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

      {/* ── Live Narrator ── */}
      <div className={styles.narratorSection}>
        <div className={styles.narratorLabel}>Live Narrator</div>
        <div className={styles.narratorText}>
          {narratorMessage}
          {phase === "verifying" && latestEvent && (
            <span className={styles.narratorCursor} />
          )}
        </div>
      </div>

      {/* ── Operational Memory (HydraDB) ── */}
      {data?.insights && data.insights !== "HydraDB not configured." && (
        <div className={styles.insightsSection}>
          <div className={styles.insightsHeader}>
            <span className={styles.insightsIcon}>🧠</span>
            <div className={styles.insightsTitleGroup}>
              <h3>Operational Memory</h3>
              <span className={styles.insightsBadge}>Powered by HydraDB</span>
            </div>
          </div>
          <div className={styles.insightsBody}>
            <p>{data.insights}</p>
          </div>
          <div className={styles.insightsFooter}>
            Recall: "What are the most frequent infrastructure failures?"
          </div>
        </div>
      )}

      {/* ── Celebration ── */}
      {celebrate && (
        <div className={styles.celebration} aria-hidden="true">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className={styles.confetti} style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              background: ["#22c55e", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6"][i % 5],
            }} />
          ))}
        </div>
      )}

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
                <div className={styles.emptyPreview}>
                  <div className={styles.previewLayers}>
                    {["0G Chain RPC", "AXL P2P Mesh", "Kimi AI", "KeeperHub"].map((name, i) => (
                      <div key={name} className={styles.previewLayer} style={{ animationDelay: `${i * 0.15}s` }}>
                        <span className={styles.previewDot} />
                        <span className={styles.previewName}>{name}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.emptyTitle}>Ready for chaos</div>
                  <div className={styles.emptyBody}>
                    Click <strong>Run The Demo</strong> or press <kbd>Space</kbd> to inject failures into all 4 layers and watch the agent recover in real-time.
                  </div>
                </div>
              ) : (
                <div className={styles.emptyBody}>Waiting for events...</div>
              )}
            </div>
          ) : (
            data.events.map((ev, i) => (
              <div
                key={`${ev.timestamp}-${i}`}
                className={`${styles.event} ${ev.event === "verdict_submitted" ? styles.eventHighlight : ""}`}
                onMouseEnter={() => setHoveredEvent(i)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                <div className={`${styles.eventDot} ${dotClass(ev.outcome)}`} />
                <div className={styles.eventBody}>
                  <div className={styles.eventType}>{EVENT_LABELS[ev.event] || ev.event}</div>
                  <div className={styles.eventAction}>
                    {EVENT_DESCRIPTIONS[ev.event] || ev.action}
                    {ev.target ? ` → ${ev.target}` : ""}
                  </div>
                  {hoveredEvent === i && ev.context && Object.keys(ev.context).length > 0 && (
                    <div className={styles.eventTooltip}>
                      {Object.entries(ev.context).map(([k, v]) => (
                        <div key={k} className={styles.tooltipRow}>
                          <span className={styles.tooltipKey}>{k}:</span>
                          <span className={styles.tooltipVal}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
