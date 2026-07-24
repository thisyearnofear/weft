#!/usr/bin/env python3
"""Emit deterministic Weft telemetry for SigNoz Cloud smoke tests."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Literal


ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agent.lib.observability import (
    emit_log_event,
    force_flush,
    record_counter,
    record_histogram,
    set_span_attrs,
    span,
)


Scenario = Literal["verified", "rejected", "fallback", "degraded"]


def _scenario_defaults(scenario: Scenario, unique_callers: int | None, threshold: int) -> tuple[int, bool, bool]:
    if unique_callers is not None:
        return unique_callers, unique_callers >= threshold, scenario == "fallback"
    if scenario == "rejected":
        return max(0, threshold - 1), False, False
    if scenario == "fallback":
        return threshold + 2, True, True
    if scenario == "degraded":
        return threshold + 2, True, False
    return threshold + 2, True, False


def main() -> int:
    parser = argparse.ArgumentParser(description="Emit a sample Weft verification trace.")
    parser.add_argument("--milestone-hash", default="0xsignozsmoke", help="Demo milestone hash label")
    parser.add_argument("--template-id", default="demo-signoz", help="Demo verification template label")
    parser.add_argument(
        "--scenario",
        choices=["verified", "rejected", "fallback", "degraded"],
        default="verified",
        help="Demo telemetry scenario to emit",
    )
    parser.add_argument("--unique-callers", type=int, default=None, help="Demo unique caller count")
    parser.add_argument("--threshold", type=int, default=3, help="Demo verification threshold")
    parser.add_argument("--settlement-via", default="keeperhub", help="Demo settlement route label")
    parser.add_argument("--repeat", type=int, default=1, help="Number of cycles to emit")
    parser.add_argument("--interval", type=float, default=0.25, help="Seconds between repeated cycles")
    parser.add_argument("--skip-agent-spans", action="store_true", help="Do not emit demo AI-agent spans")
    args = parser.parse_args()

    for index in range(max(1, args.repeat)):
        started = time.monotonic()
        unique_callers, verified, fallback = _scenario_defaults(args.scenario, args.unique_callers, args.threshold)
        degraded = args.scenario == "degraded"
        milestone_hash = args.milestone_hash if args.repeat == 1 else f"{args.milestone_hash}-{index + 1}"

        with span(
            "weft.verification_cycle",
            **{
                "weft.milestone_hash": milestone_hash,
                "weft.template_id": args.template_id,
                "weft.rail": "evm",
                "weft.demo_scenario": args.scenario,
            },
        ):
            if not args.skip_agent_spans:
                with span(
                    "weft.agent.plan",
                    **{
                        "weft.agent.name": "weft-verifier",
                        "weft.agent.goal": "verify milestone and release capital safely",
                        "weft.agent.steps": 5,
                        "weft.milestone_hash": milestone_hash,
                    },
                ):
                    record_counter("weft_agent_plans_total", agent="weft-verifier", outcome="created")

            with span("weft.deadline.poll", **{"weft.pending_count": 1}):
                record_counter("weft_deadline_polls_total", rail="evm")

            with span(
                "weft.evidence.deployment",
                **{
                    "weft.milestone_hash": milestone_hash,
                    "weft.contract_code_exists": True,
                    "weft.code_hash": "0xdemo",
                },
            ):
                record_counter("weft_evidence_checks_total", check="deployment", outcome="pass")
                if not args.skip_agent_spans:
                    with span(
                        "weft.agent.tool_call",
                        **{
                            "weft.agent.name": "weft-verifier",
                            "weft.tool.name": "eth_getCode",
                            "weft.tool.target": "0G Chain RPC",
                            "weft.tool.outcome": "success",
                            "weft.milestone_hash": milestone_hash,
                        },
                    ):
                        record_counter("weft_agent_tool_calls_total", tool="eth_getCode", outcome="success")

            with span(
                "weft.evidence.usage",
                **{
                    "weft.milestone_hash": milestone_hash,
                    "weft.unique_callers": unique_callers,
                    "weft.unique_caller_threshold": args.threshold,
                },
            ):
                record_counter("weft_evidence_checks_total", check="usage", outcome="pass" if verified else "fail")
                if not args.skip_agent_spans:
                    with span(
                        "weft.agent.tool_call",
                        **{
                            "weft.agent.name": "weft-verifier",
                            "weft.tool.name": "count_unique_callers",
                            "weft.tool.target": "0G Chain RPC",
                            "weft.tool.outcome": "success" if verified else "threshold_miss",
                            "weft.milestone_hash": milestone_hash,
                        },
                    ):
                        record_counter(
                            "weft_agent_tool_calls_total",
                            tool="count_unique_callers",
                            outcome="success" if verified else "threshold_miss",
                        )

            if not args.skip_agent_spans:
                llm_input_tokens = 742
                llm_output_tokens = 168
                llm_cost_usd = 0.012
                with span(
                    "weft.llm.chat",
                    **{
                        "weft.llm.backend": "kimi",
                        "weft.llm.model": "moonshot-v1-128k",
                        "weft.llm.task": "builder_journey_narrative",
                        "weft.llm.outcome": "success",
                        "weft.milestone_hash": milestone_hash,
                        "gen_ai.system": "kimi",
                        "gen_ai.request.model": "moonshot-v1-128k",
                        "gen_ai.response.model": "moonshot-v1-128k",
                        "gen_ai.usage.input_tokens": llm_input_tokens,
                        "gen_ai.usage.output_tokens": llm_output_tokens,
                        "gen_ai.usage.total_tokens": llm_input_tokens + llm_output_tokens,
                        "weft.llm.cost_usd": llm_cost_usd,
                    },
                ):
                    record_counter("weft_llm_requests_total", backend="kimi", model="moonshot-v1-128k", outcome="success")
                    record_histogram("weft_llm_duration_ms", 980, backend="kimi", model="moonshot-v1-128k", outcome="success")
                    record_histogram("weft_llm_tokens_total", llm_input_tokens + llm_output_tokens, backend="kimi", model="moonshot-v1-128k")
                    record_histogram("weft_llm_cost_usd", llm_cost_usd, backend="kimi", model="moonshot-v1-128k")

            matched_signers = 1 if degraded else 2
            with span("weft.consensus.wait", **{"weft.peer_threshold": 2, "weft.matching_peers": matched_signers}):
                record_histogram(
                    "weft_consensus_latency_ms",
                    1800 if degraded else 42,
                    peer_threshold=2,
                    matched_signers=matched_signers,
                )
                if degraded:
                    record_counter("weft_recovery_events_total", event="consensus_degraded", outcome="warning")
                    emit_log_event(
                        "weft.recovery",
                        **{
                            "weft.recovery.event": "consensus_degraded",
                            "weft.recovery.outcome": "warning",
                            "weft.recovery.action": "skip_vote_until_quorum",
                            "weft.milestone_hash": milestone_hash,
                        },
                    )

            keeperhub_status = "fallback" if fallback else "confirmed"
            with span(
                "weft.keeperhub.release",
                **{
                    "weft.settlement_via": args.settlement_via,
                    "weft.verified": verified,
                    "weft.keeperhub_status": keeperhub_status,
                    "weft.tx_hash": "0xdemosignoz",
                },
            ):
                record_counter("weft_keeperhub_executions_total", status=keeperhub_status)
                if fallback:
                    record_counter("weft_keeperhub_fallback_total", reason="keeperhub_503")
                    record_counter("weft_recovery_events_total", event="keeperhub_503", outcome="fallback")
                    emit_log_event(
                        "weft.recovery",
                        **{
                            "weft.recovery.event": "keeperhub_503",
                            "weft.recovery.outcome": "fallback",
                            "weft.recovery.action": "fallback_to_cast",
                            "weft.milestone_hash": milestone_hash,
                        },
                    )

            duration_ms = (time.monotonic() - started) * 1000
            outcome = "degraded" if degraded else "verified" if verified else "rejected"
            set_span_attrs(**{"weft.verified": verified, "weft.duration_ms": duration_ms, "weft.outcome": outcome})
            record_counter("weft_verification_cycles_total", outcome=outcome, rail="evm")
            record_histogram("weft_verification_duration_ms", duration_ms, rail="evm", outcome=outcome)
            emit_log_event(
                "weft.recovery",
                **{
                    "weft.recovery.event": "signoz_smoke",
                    "weft.recovery.outcome": "success",
                    "weft.recovery.action": "emit_demo_telemetry",
                    "weft.milestone_hash": milestone_hash,
                },
            )

        if index + 1 < args.repeat:
            time.sleep(args.interval)

    force_flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
