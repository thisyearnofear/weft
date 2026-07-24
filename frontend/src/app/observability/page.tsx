"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  Clock3,
  Coins,
  Eye,
  Gauge,
  ListChecks,
  RadioTower,
  ReceiptText,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import styles from "./page.module.css";

const TRACE_FILTER = "service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'";

const SPANS = [
  {
    name: "weft.agent.plan",
    count: 1,
    label: "Plan",
    detail: "The verifier decides how to verify and release capital safely.",
    icon: Bot,
  },
  {
    name: "weft.agent.tool_call",
    count: 2,
    label: "Tools",
    detail: "Chain evidence calls are visible as agent tool use.",
    icon: TerminalSquare,
  },
  {
    name: "weft.llm.chat",
    count: 1,
    label: "LLM",
    detail: "Narrative generation exposes model, tokens, latency, and cost.",
    icon: Braces,
  },
  {
    name: "weft.verification_cycle",
    count: 1,
    label: "Cycle",
    detail: "The capital-release decision is one inspectable trace.",
    icon: Gauge,
  },
  {
    name: "weft.evidence.deployment",
    count: 1,
    label: "Deploy",
    detail: "Deployment evidence is checked deterministically.",
    icon: ShieldCheck,
  },
  {
    name: "weft.evidence.usage",
    count: 1,
    label: "Usage",
    detail: "Unique-caller threshold is checked before any verdict.",
    icon: ListChecks,
  },
];

const DASHBOARD_PANELS = [
  ["Agent workflow spans", "Traces grouped by span name"],
  ["LLM requests", "Backend, model, outcome"],
  ["LLM token cost", "Total tokens and estimated cost"],
  ["Verification outcomes", "Verified, rejected, degraded, fallback"],
  ["Tool call outcomes", "RPC and verifier tools by result"],
  ["Peer consensus health", "Matching peers vs quorum threshold"],
  ["KeeperHub reliability", "Confirmed vs fallback settlement"],
  ["Recovery events", "Degraded paths and autonomous recovery"],
];

const ALERTS = [
  {
    name: "KeeperHub fallback activated",
    filter: "name = 'weft.keeperhub.release' AND weft.keeperhub_status = 'fallback'",
  },
  {
    name: "Peer quorum degraded",
    filter: "weft.recovery.event = 'consensus_degraded'",
  },
  {
    name: "LLM narrative failures",
    filter: "name = 'weft.llm.chat' AND weft.llm.outcome = 'error'",
  },
];

export default function ObservabilityPage() {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Breadcrumbs items={[{ label: "Agent Observatory" }]} />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <Eye size={15} /> SigNoz-powered agent observability
            </div>
            <h1>See inside the agent before it moves money.</h1>
            <p>
              Weft traces the autonomous verifier from plan to tool calls to LLM narrative
              to deterministic evidence checks. SigNoz is the evidence backend; this page
              is the user-facing audit lens.
            </p>
            <div className={styles.heroActions}>
              <Link href="/operations" className={styles.primaryAction}>
                Open operations <ArrowRight size={16} />
              </Link>
              <a
                href="https://modest-mosquito.us2.signoz.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryAction}
              >
                Open SigNoz <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className={styles.proofPanel}>
            <div className={styles.proofHeader}>
              <ServerCog size={18} />
              <span>Validated trace</span>
            </div>
            <code>{TRACE_FILTER}</code>
            <div className={styles.proofStats}>
              <div>
                <strong>6</strong>
                <span>span groups</span>
              </div>
              <div>
                <strong>7</strong>
                <span>visible spans</span>
              </div>
              <div>
                <strong>200</strong>
                <span>API read</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.traceSection}>
          <div className={styles.sectionHeader}>
            <span>Trace Waterfall</span>
            <h2>The agent is not a black box.</h2>
          </div>
          <div className={styles.timeline}>
            {SPANS.map((span, index) => {
              const Icon = span.icon;
              return (
                <div key={span.name} className={styles.timelineItem}>
                  <div className={styles.timelineIndex}>{String(index + 1).padStart(2, "0")}</div>
                  <div className={styles.timelineIcon}>
                    <Icon size={16} />
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>
                      <span>{span.label}</span>
                      <code>{span.name}</code>
                    </div>
                    <p>{span.detail}</p>
                  </div>
                  <strong className={styles.timelineCount}>{span.count}</strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.gridSection}>
          <div className={styles.valueCard}>
            <div className={styles.cardIcon}><Coins size={18} /></div>
            <h2>Why users should care</h2>
            <p>
              Program officers do not need SigNoz accounts. They need a defensible receipt:
              what evidence was checked, what the agent did, whether the LLM merely narrated,
              and why capital released or stayed locked.
            </p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.cardIcon}><ReceiptText size={18} /></div>
            <h2>What the receipt proves</h2>
            <p>
              The boolean verdict is deterministic. The LLM span exists so teams can inspect
              cost and narrative behavior, not because an LLM is allowed to decide payment.
            </p>
          </div>
          <div className={styles.valueCard}>
            <div className={styles.cardIcon}><AlertTriangle size={18} /></div>
            <h2>What failures reveal</h2>
            <p>
              KeeperHub fallback, degraded peer quorum, and LLM failures become alertable
              conditions. A failed dependency is no longer hidden inside an autonomous run.
            </p>
          </div>
        </section>

        <section className={styles.dashboardSection}>
          <div className={styles.sectionHeader}>
            <span>Dashboard</span>
            <h2>Eight panels that match the judging criteria.</h2>
          </div>
          <div className={styles.panelGrid}>
            {DASHBOARD_PANELS.map(([title, body], index) => (
              <div key={title} className={styles.panelItem}>
                <span>{index + 1}</span>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.alertSection}>
          <div className={styles.sectionHeader}>
            <span>Alerts</span>
            <h2>Failure modes become operating signals.</h2>
          </div>
          <div className={styles.alertList}>
            {ALERTS.map((alert) => (
              <div key={alert.name} className={styles.alertItem}>
                <RadioTower size={17} />
                <div>
                  <strong>{alert.name}</strong>
                  <code>{alert.filter}</code>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.demoStrip}>
          <div>
            <Clock3 size={18} />
            <span>Demo command</span>
          </div>
          <code>agent/scripts/weft_signoz_demo.sh</code>
          <CheckCircle2 size={18} />
        </section>
      </div>
    </div>
  );
}
