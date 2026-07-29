import { pad, stringToHex, hexToString } from "viem";
import { Code, Database, FileText, Megaphone } from "lucide-react";

export type TemplateId =
  | "evm.deployment_usage.v1"
  | "research.report.v1"
  | "marketing.campaign.v1"
  | "data.pipeline.v1";

export interface TemplateOption {
  id: TemplateId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}

export const TEMPLATES: TemplateOption[] = [
  {
    id: "evm.deployment_usage.v1",
    label: "EVM Deployment + Usage",
    shortLabel: "EVM",
    description: "Verify a deployed contract has real callers in a measurement window.",
    icon: Code,
  },
  {
    id: "research.report.v1",
    label: "Research Report",
    shortLabel: "Research",
    description: "Verify a report by word count, citations, sources, and plagiarism score.",
    icon: FileText,
  },
  {
    id: "marketing.campaign.v1",
    label: "Marketing Campaign",
    shortLabel: "Marketing",
    description: "Verify impressions, pageviews, and clicks against campaign thresholds.",
    icon: Megaphone,
  },
  {
    id: "data.pipeline.v1",
    label: "Data Pipeline",
    shortLabel: "Data",
    description: "Verify a pipeline output by row count, freshness, and file hash.",
    icon: Database,
  },
];

export function templateIdToBytes32(templateId: TemplateId) {
  return pad(stringToHex(templateId), { dir: "right", size: 32 });
}

export function bytes32ToTemplateId(bytes32: string): string {
  try {
    const str = hexToString(bytes32 as `0x${string}`);
    const trimmed = str.replace(/\0/g, "");
    return trimmed || "unknown";
  } catch {
    return "unknown";
  }
}

export function templateLabel(templateId: string) {
  return TEMPLATES.find((t) => t.id === templateId)?.label ?? templateId;
}

export function templateShortLabel(templateId: string) {
  return TEMPLATES.find((t) => t.id === templateId)?.shortLabel ?? templateId;
}

export function templateLabelFromBytes32(bytes32: string): string {
  const id = bytes32ToTemplateId(bytes32);
  if (id === "unknown") return "Legacy EVM";
  return templateLabel(id);
}

export function templateShortLabelFromBytes32(bytes32: string): string {
  const id = bytes32ToTemplateId(bytes32);
  if (id === "unknown") return "Legacy";
  return templateShortLabel(id);
}

export function emptyInputs(templateId: TemplateId): Record<string, string> {
  switch (templateId) {
    case "evm.deployment_usage.v1":
      return {
        contractAddress: "",
        measurementWindowSeconds: "604800",
        uniqueCallerThreshold: "10",
      };
    case "research.report.v1":
      return {
        deliverableHash: "",
        wordCount: "",
        citationCount: "",
        sourceCount: "",
        plagiarismScore: "",
        requiredWords: "1500",
        requiredCitations: "10",
        requiredSources: "5",
        maxPlagiarism: "10",
      };
    case "marketing.campaign.v1":
      return {
        deliverableHash: "",
        twitterImpressions: "",
        gaPageviews: "",
        gaClicks: "",
        requiredImpressions: "1000",
        requiredPageviews: "1000",
        requiredClicks: "100",
      };
    case "data.pipeline.v1":
      return {
        fileHash: "",
        rowCount: "",
        freshnessTimestamp: "",
        schemaHash: "",
        requiredRowCount: "500",
        requiredFreshnessSeconds: "3600",
      };
    default:
      return {};
  }
}

export interface BuildMilestoneMetadataOptions {
  templateId: TemplateId;
  templateInputs: Record<string, string>;
  confidential: boolean;
  chainId: number | undefined;
  deadlineUnix: bigint;
  name: string;
  description: string;
}

export function buildMilestoneMetadata(options: BuildMilestoneMetadataOptions): Record<string, unknown> {
  const { templateId, templateInputs, confidential, chainId, deadlineUnix, name, description } = options;

  let templateInputsPayload: Record<string, unknown> = {};

  switch (templateId) {
    case "evm.deployment_usage.v1":
      templateInputsPayload = {
        contractAddress: templateInputs.contractAddress,
        measurementWindowSeconds: Number(templateInputs.measurementWindowSeconds) || 0,
        uniqueCallerThreshold: Number(templateInputs.uniqueCallerThreshold) || 0,
      };
      break;
    case "research.report.v1":
      templateInputsPayload = {
        deliverable_hash: templateInputs.deliverableHash,
        word_count: Number(templateInputs.wordCount) || 0,
        citation_count: Number(templateInputs.citationCount) || 0,
        source_count: Number(templateInputs.sourceCount) || 0,
        plagiarism_score: Number(templateInputs.plagiarismScore) || 0,
        required_words: Number(templateInputs.requiredWords) || 0,
        required_citations: Number(templateInputs.requiredCitations) || 0,
        required_sources: Number(templateInputs.requiredSources) || 0,
        max_plagiarism: Number(templateInputs.maxPlagiarism) || 100,
      };
      break;
    case "marketing.campaign.v1":
      templateInputsPayload = {
        deliverable_hash: templateInputs.deliverableHash,
        twitter_impressions: Number(templateInputs.twitterImpressions) || 0,
        ga_pageviews: Number(templateInputs.gaPageviews) || 0,
        ga_clicks: Number(templateInputs.gaClicks) || 0,
        required_impressions: Number(templateInputs.requiredImpressions) || 0,
        required_pageviews: Number(templateInputs.requiredPageviews) || 0,
        required_clicks: Number(templateInputs.requiredClicks) || 0,
      };
      break;
    case "data.pipeline.v1":
      templateInputsPayload = {
        file_hash: templateInputs.fileHash,
        row_count: Number(templateInputs.rowCount) || 0,
        freshness_timestamp: Number(templateInputs.freshnessTimestamp) || 0,
        schema_hash: templateInputs.schemaHash,
        required_row_count: Number(templateInputs.requiredRowCount) || 0,
        required_freshness_seconds: Number(templateInputs.requiredFreshnessSeconds) || 0,
      };
      break;
  }

  return {
    templateId,
    chainId: confidential ? 11155111 : (chainId ?? 16602),
    deadline: Number(deadlineUnix),
    notes: description || name,
    templateInputs: templateInputsPayload,
  };
}

export interface PrepareMetadataResult {
  ok: boolean;
  metadataHash: string;
  uploaded: boolean;
  fallbackReason?: string;
}

export async function prepareMilestoneMetadata(
  metadata: Record<string, unknown>
): Promise<PrepareMetadataResult> {
  const res = await fetch("/api/milestone-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });

  const data = (await res.json()) as PrepareMetadataResult & { error?: string };
  if (!data.ok) {
    throw new Error(data.error || "Failed to prepare metadata");
  }
  return data;
}
