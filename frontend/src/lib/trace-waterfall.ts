import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Braces,
  Gauge,
  ListChecks,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import type { SignozSpanName } from "@/lib/signoz-config";

export interface TraceWaterfallSpan {
  name: SignozSpanName;
  label: string;
  detail: string;
  icon: LucideIcon;
  highlight?: boolean;
}

export const TRACE_WATERFALL_SPANS: TraceWaterfallSpan[] = [
  {
    name: "weft.agent.plan",
    label: "Plan",
    detail: "The verifier decides how to verify and release capital safely.",
    icon: Bot,
  },
  {
    name: "weft.agent.tool_call",
    label: "Tools",
    detail: "Chain evidence calls are visible as agent tool use.",
    icon: TerminalSquare,
  },
  {
    name: "weft.llm.chat",
    label: "LLM",
    detail: "Narrative generation exposes model, tokens, latency, and cost — observed, not decisive.",
    icon: Braces,
    highlight: true,
  },
  {
    name: "weft.verification_cycle",
    label: "Cycle",
    detail: "The capital-release decision is one inspectable trace.",
    icon: Gauge,
  },
  {
    name: "weft.evidence.deployment",
    label: "Deploy",
    detail: "Deployment evidence is checked deterministically.",
    icon: ShieldCheck,
  },
  {
    name: "weft.evidence.usage",
    label: "Usage",
    detail: "Unique-caller threshold is checked before any verdict.",
    icon: ListChecks,
  },
];

export const GUIDED_DEMO_STEPS = [
  {
    id: "problem",
    title: "Problem",
    blurb: "If an agent can release capital, it cannot be a black box.",
    anchor: "step-problem",
  },
  {
    id: "waterfall",
    title: "Trace waterfall",
    blurb: "Plan → tools → LLM → evidence → cycle.",
    anchor: "step-waterfall",
  },
  {
    id: "receipt",
    title: "Agent receipt",
    blurb: "SigNoz ground truth, Weft audit lens.",
    anchor: "step-receipt",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    blurb: "Eight panels for agent ops.",
    anchor: "step-dashboard",
  },
  {
    id: "alerts",
    title: "Alerts",
    blurb: "Failure modes become operating signals.",
    anchor: "step-alerts",
  },
] as const;
