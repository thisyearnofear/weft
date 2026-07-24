"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import styles from "./page.module.css";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  example: string;
  response: string;
  tryUrl?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/status/demo",
    description: "Overview of the Weft system — pitch, demo hints, known milestone hashes, and partner stack.",
    example: `curl https://weft.thisyearnofear.com/api/status/demo`,
    response: `{
  "ok": true,
  "pitch": "Weft is a decentralized verifier swarm...",
  "demoHints": {
    "milestones": ["0x516975af..."],
    "builderEns": "weft.thisyearnofear.eth",
    "metadataIndexer": "https://indexer-storage-testnet-turbo.0g.ai"
  }
}`,
    tryUrl: "/api/status/demo",
  },
  {
    method: "GET",
    path: "/api/status/milestone/[hash]",
    description: "Full milestone detail by hash — onchain state, verifier votes, evidence root, and demo tracks.",
    example: `curl https://weft.thisyearnofear.com/api/status/milestone/0x516975af...`,
    response: `{
  "ok": true,
  "milestoneHash": "0x516975af...",
  "verified": true,
  "released": true,
  "verifierCount": 2,
  "verifiedVotes": 2,
  "totalStaked": "10000000000000000",
  "finalEvidenceRoot": "0x01e1b3..."
}`,
    tryUrl: "/api/status/milestone/0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f",
  },
  {
    method: "GET",
    path: "/api/explorer/milestones",
    description: "List all known milestones with derived state, builder ENS, stake in ETH, and evidence roots.",
    example: `curl https://weft.thisyearnofear.com/api/explorer/milestones`,
    response: `{
  "ok": true,
  "count": 1,
  "milestones": [{
    "milestoneHash": "0x516975af...",
    "state": "verified",
    "statusLabel": "Released",
    "stakedEth": "0.0100",
    "builderEns": "weft.thisyearnofear.eth"
  }]
}`,
    tryUrl: "/api/explorer/milestones",
  },
  {
    method: "GET",
    path: "/api/operations",
    description: "Agent operations dashboard data — treasury ledger, verification log, and infrastructure health.",
    example: `curl https://weft.thisyearnofear.com/api/operations`,
    response: `{
  "ok": true,
  "treasury": { "earned": 1.0, "spent": 1.5, "net": -0.5 },
  "recovery": { "totalEvents": 0, "failures": 0 },
  "verifications": [{ "verified": true, "released": true }]
}`,
    tryUrl: "/api/operations",
  },
  {
    method: "GET",
    path: "/api/sponsor",
    description: "Sponsor dashboard — funded milestones with capital flow status (locked/released/refundable).",
    example: `curl https://weft.thisyearnofear.com/api/sponsor`,
    response: `{
  "ok": true,
  "summary": {
    "totalReleased": "0.0100",
    "totalLocked": "0.0000",
    "verifiedCount": 1
  },
  "milestones": [...]
}`,
    tryUrl: "/api/sponsor",
  },
  {
    method: "GET",
    path: "/api/activity",
    description: "Chronological activity feed — all agent actions (verifications, charges, revenue, chaos events).",
    example: `curl https://weft.thisyearnofear.com/api/activity`,
    response: `{
  "ok": true,
  "count": 7,
  "events": [{
    "type": "revenue",
    "title": "Revenue swept",
    "timestamp": 1782829396
  }]
}`,
    tryUrl: "/api/activity",
  },
  {
    method: "GET",
    path: "/api/verifiers",
    description: "Verifier network status — authorized nodes, votes cast, consensus agreement rate.",
    example: `curl https://weft.thisyearnofear.com/api/verifiers`,
    response: `{
  "ok": true,
  "verifiers": [{ "address": "0xebe2...", "votesCast": 2 }],
  "consensus": { "agreementRate": "100.0" }
}`,
    tryUrl: "/api/verifiers",
  },
  {
    method: "GET",
    path: "/api/treasury",
    description: "Agent treasury — Stripe charges, revenue sweeps, balance, and per-service spend breakdown.",
    example: `curl https://weft.thisyearnofear.com/api/treasury`,
    response: `{
  "ok": true,
  "earned": 1.0,
  "spent": 1.5,
  "net": -0.5,
  "spendByService": { "keeperhub": 0.5, "fal": 0.5, "kimi": 0.5 }
}`,
    tryUrl: "/api/treasury",
  },
  {
    method: "GET",
    path: "/api/recovery",
    description: "Recovery and resilience data — chaos events, failures, recoveries, and verdict landing status.",
    example: `curl https://weft.thisyearnofear.com/api/recovery`,
    response: `{
  "ok": true,
  "summary": { "totalEvents": 0, "failures": 0, "recoveries": 0 },
  "chaos": { "active": [] }
}`,
    tryUrl: "/api/recovery",
  },
  {
    method: "GET",
    path: "/api/ens/[name]",
    description: "ENS text records for a builder — avatar, description, social links, and Weft reputation fields.",
    example: `curl https://weft.thisyearnofear.com/api/ens/weft.thisyearnofear.eth`,
    response: `{
  "ens": "weft.thisyearnofear.eth",
  "address": "0xebe2ee53...",
  "weftMilestonesVerified": 1,
  "weftReputationScore": 85
}`,
    tryUrl: "/api/ens/weft.thisyearnofear.eth",
  },
  {
    method: "POST",
    path: "/api/chaos",
    description: "Inject a chaos event into the verification pipeline (for resilience testing).",
    example: `curl -X POST https://weft.thisyearnofear.com/api/chaos \\
  -H "Content-Type: application/json" \\
  -d '{"type":"rpc_timeout"}'`,
    response: `{ "ok": true, "injected": true }`,
  },
  {
    method: "POST",
    path: "/api/chaos/verify",
    description: "Trigger a demo verification cycle through the chaos-injected pipeline.",
    example: `curl -X POST https://weft.thisyearnofear.com/api/chaos/verify`,
    response: `{ "ok": true, "verified": true }`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to Weft
        </Link>

        <div className={styles.header}>
          <div className={styles.eyebrow}>
            <BookOpen size={15} /> API Reference
          </div>
          <h1 className={styles.title}>Public REST API</h1>
          <p className={styles.subtitle}>
            Every Weft surface is backed by a REST endpoint. All GET endpoints are public and
            return JSON. No authentication required for read endpoints.
          </p>
        </div>

        {ENDPOINTS.map((ep) => (
          <div key={`${ep.method}-${ep.path}`} className={styles.endpoint}>
            <div className={styles.endpointHeader}>
              <span className={`${styles.method} ${ep.method === "GET" ? styles.methodGet : styles.methodPost}`}>
                {ep.method}
              </span>
              <span className={styles.path}>{ep.path}</span>
            </div>
            <p className={styles.description}>{ep.description}</p>
            <div className={styles.example}>
              <div className={styles.exampleLabel}>Example</div>
              <pre className={styles.exampleCode}>{ep.example}</pre>
            </div>
            <div className={styles.example}>
              <div className={styles.exampleLabel}>Response</div>
              <pre className={styles.exampleResponse}>{ep.response}</pre>
            </div>
            {ep.tryUrl && (
              <a href={ep.tryUrl} target="_blank" rel="noopener noreferrer" className={styles.tryIt}>
                Try it <ExternalLink size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
