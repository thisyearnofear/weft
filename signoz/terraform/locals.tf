locals {
  dashboard_name  = "weft-agent-observatory"
  dashboard_title = "Weft Autonomous Agent Observatory"
  service_name    = "weft-daemon"

  # Winning demo trace from docs/signoz-winning-position.md
  winning_trace_filter = "service.name = 'weft-daemon' AND weft.milestone_hash = '0xwinningagent2'"

  layout = [
    { h = 7, i = "agent-workflow", w = 3, x = 0, y = 0, moved = false, static = false },
    { h = 7, i = "llm-requests", w = 3, x = 3, y = 0, moved = false, static = false },
    { h = 7, i = "llm-cost", w = 3, x = 6, y = 0, moved = false, static = false },
    { h = 7, i = "verification-outcomes", w = 3, x = 9, y = 0, moved = false, static = false },
    { h = 7, i = "tool-calls", w = 3, x = 0, y = 7, moved = false, static = false },
    { h = 7, i = "peer-consensus", w = 3, x = 3, y = 7, moved = false, static = false },
    { h = 7, i = "keeperhub", w = 3, x = 6, y = 7, moved = false, static = false },
    { h = 7, i = "recovery-events", w = 3, x = 9, y = 7, moved = false, static = false },
  ]
}
