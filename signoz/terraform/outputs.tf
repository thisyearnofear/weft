output "dashboard_id" {
  description = "SigNoz dashboard ID for Weft Agent Observatory"
  value       = signoz_dashboard.weft_agent_observatory.id
}

output "dashboard_url" {
  description = "Direct link to the provisioned dashboard"
  value       = "${var.signoz_endpoint}/dashboard/${signoz_dashboard.weft_agent_observatory.id}"
}

output "winning_trace_filter" {
  description = "Trace filter for the judge demo"
  value       = local.winning_trace_filter
}

output "traces_explorer_url" {
  description = "SigNoz traces explorer pre-filtered for the winning demo trace"
  value       = "${var.signoz_endpoint}/traces-explorer?filter=${urlencode(local.winning_trace_filter)}"
}

output "alert_ids" {
  description = "Provisioned alert rule IDs"
  value = {
    keeperhub_fallback     = signoz_rule.keeperhub_fallback.id
    peer_quorum_degraded   = signoz_rule.peer_quorum_degraded.id
    llm_narrative_failures = signoz_rule.llm_narrative_failures.id
  }
}
