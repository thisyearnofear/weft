"use client";

import { CheckCircle2 } from "lucide-react";
import { bytes32ToTemplateId, templateLabel } from "@/lib/milestoneTemplates";
import styles from "./TemplateEvidencePanel.module.css";

export interface TemplateEvidencePanelProps {
  templateId: string;
  metadata?: Record<string, unknown> | null;
  milestone?: {
    builder: string;
    verified: boolean;
    released: boolean;
    verifiedVotes: number;
    verifierCount: number;
    totalStaked: string | number | bigint;
    finalEvidenceRoot?: string | null;
  } | null;
}

function EvidenceRow({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className={styles.evidenceRow}>
      <span className={`${styles.evidenceIcon} ${passed ? styles.evidenceIconPassed : ""}`}>
        {passed ? "✓" : "○"}
      </span>
      <div className={styles.evidenceBody}>
        <div className={styles.evidenceLabel}>{label}</div>
        <div className={styles.evidenceDetail}>{detail}</div>
      </div>
    </div>
  );
}

export function TemplateEvidencePanel({ templateId, metadata, milestone }: TemplateEvidencePanelProps) {
  const id = bytes32ToTemplateId(templateId);
  const inputs = (metadata?.templateInputs as Record<string, unknown> | undefined) ?? {};
  const zeroBuilder = "0x0000000000000000000000000000000000000000";
  const isUnfunded = BigInt(String(milestone?.totalStaked ?? 0)) === BigInt(0);

  const rows: { key: string; label: string; passed: boolean; detail: string }[] = [];

  if (id === "evm.deployment_usage.v1" || id === "unknown") {
    rows.push({
      key: "deployment",
      label: "Contract deployment",
      passed: Boolean(milestone?.builder && milestone.builder !== zeroBuilder),
      detail: "Deployed contract exists on 0G chain at the stated address",
    });
    rows.push({
      key: "votes",
      label: "Verifier votes received",
      passed: (milestone?.verifiedVotes ?? 0) > 0,
      detail:
        (milestone?.verifiedVotes ?? 0) > 0
          ? `${milestone?.verifiedVotes} vote${milestone?.verifiedVotes === 1 ? "" : "s"} recorded`
          : "Awaiting verifier votes",
    });
  }

  if (id === "research.report.v1") {
    const wordCount = Number(inputs.word_count ?? 0);
    const requiredWords = Number(inputs.required_words ?? 0);
    const citationCount = Number(inputs.citation_count ?? 0);
    const requiredCitations = Number(inputs.required_citations ?? 0);
    rows.push({
      key: "words",
      label: "Word count",
      passed: requiredWords > 0 ? wordCount >= requiredWords : wordCount > 0,
      detail: `${wordCount}${requiredWords > 0 ? ` / ${requiredWords} required` : ""}`,
    });
    rows.push({
      key: "citations",
      label: "Citations",
      passed: requiredCitations > 0 ? citationCount >= requiredCitations : citationCount > 0,
      detail: `${citationCount}${requiredCitations > 0 ? ` / ${requiredCitations} required` : ""}`,
    });
    rows.push({
      key: "deliverable",
      label: "Deliverable hash",
      passed: Boolean(inputs.deliverable_hash),
      detail: String(inputs.deliverable_hash || "Pending"),
    });
  }

  if (id === "marketing.campaign.v1") {
    const impressions = Number(inputs.twitter_impressions ?? 0);
    const pageviews = Number(inputs.ga_pageviews ?? 0);
    const clicks = Number(inputs.ga_clicks ?? 0);
    const reqImpressions = Number(inputs.required_impressions ?? 0);
    const reqPageviews = Number(inputs.required_pageviews ?? 0);
    const reqClicks = Number(inputs.required_clicks ?? 0);
    rows.push({
      key: "impressions",
      label: "Twitter impressions",
      passed: reqImpressions > 0 ? impressions >= reqImpressions : impressions > 0,
      detail: `${impressions}${reqImpressions > 0 ? ` / ${reqImpressions}` : ""}`,
    });
    rows.push({
      key: "pageviews",
      label: "GA pageviews",
      passed: reqPageviews > 0 ? pageviews >= reqPageviews : pageviews > 0,
      detail: `${pageviews}${reqPageviews > 0 ? ` / ${reqPageviews}` : ""}`,
    });
    rows.push({
      key: "clicks",
      label: "GA clicks",
      passed: reqClicks > 0 ? clicks >= reqClicks : clicks > 0,
      detail: `${clicks}${reqClicks > 0 ? ` / ${reqClicks}` : ""}`,
    });
  }

  if (id === "data.pipeline.v1") {
    const rowCount = Number(inputs.row_count ?? 0);
    const requiredRowCount = Number(inputs.required_row_count ?? 0);
    const freshnessTimestamp = Number(inputs.freshness_timestamp ?? 0);
    const requiredFreshnessSeconds = Number(inputs.required_freshness_seconds ?? 0);
    rows.push({
      key: "rows",
      label: "Row count",
      passed: requiredRowCount > 0 ? rowCount >= requiredRowCount : rowCount > 0,
      detail: `${rowCount}${requiredRowCount > 0 ? ` / ${requiredRowCount} required` : ""}`,
    });
    rows.push({
      key: "freshness",
      label: "Freshness",
      passed: requiredFreshnessSeconds > 0 && freshnessTimestamp > 0,
      detail:
        freshnessTimestamp > 0
          ? `Updated at ${new Date(freshnessTimestamp * 1000).toLocaleString()}${
              requiredFreshnessSeconds > 0 ? ` (within ${requiredFreshnessSeconds}s)` : ""
            }`
          : "Pending freshness timestamp",

    });
    rows.push({
      key: "fileHash",
      label: "File hash",
      passed: Boolean(inputs.file_hash),
      detail: String(inputs.file_hash || "Pending"),
    });
  }

  // Fallback for any other future template
  if (rows.length === 0) {
    rows.push({
      key: "generic",
      label: "Template evidence",
      passed: false,
      detail: `No specific checks defined for template ${id}`,
    });
  }

  // Common rows for every template
  rows.push({
    key: "quorum",
    label: "Verifier quorum",
    passed: (milestone?.verifierCount ?? 0) > 0 && (milestone?.verifiedVotes ?? 0) > 0,
    detail:
      (milestone?.verifierCount ?? 0) > 0
        ? `${milestone?.verifiedVotes}/${milestone?.verifierCount} votes`
        : "No verifiers assigned",
  });
  rows.push({
    key: "evidenceRoot",
    label: "Final evidence",
    passed: Boolean(milestone?.finalEvidenceRoot && milestone.finalEvidenceRoot !== "0x" + "0".repeat(64)),
    detail: milestone?.finalEvidenceRoot ? "Anchored onchain" : "Not yet published",
  });
  rows.push({
    key: "payout",
    label: isUnfunded ? "Reputation payout" : "Capital release",
    passed: isUnfunded ? Boolean(milestone?.verified) : Boolean(milestone?.released),
    detail: isUnfunded
      ? milestone?.verified
        ? "No stake to move — verified proof minted to the builder's reputation"
        : "Unfunded run — a verified outcome mints reputation instead of capital"
      : milestone?.released
        ? "Capital released to builder"
        : "Locked until release",
  });

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.kicker}>What I checked</span>
          <h3>Verification timeline · {templateLabel(id)}</h3>
        </div>
        <CheckCircle2 size={18} />
      </div>
      <p className={styles.panelText} style={{ marginBottom: "0.5rem" }}>
        This milestone uses the <strong>{templateLabel(id)}</strong> verification template.
        Each check below ran autonomously against the evidence submitted at creation.
      </p>
      <div className={styles.evidenceList}>
        {rows.map((r) => (
          <EvidenceRow key={r.key} label={r.label} passed={r.passed} detail={r.detail} />
        ))}
      </div>
      {milestone?.finalEvidenceRoot && milestone.finalEvidenceRoot !== "0x" + "0".repeat(64) && (
        <div className={styles.codeBlock}>
          <span className={styles.codeLabel}>Evidence root</span>
          <code>{milestone.finalEvidenceRoot}</code>
        </div>
      )}
    </div>
  );
}
