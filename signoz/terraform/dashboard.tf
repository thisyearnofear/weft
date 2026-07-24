resource "signoz_dashboard" "weft_agent_observatory" {
  collapsable_rows_migrated = true
  description               = "Agent workflow, LLM cost, evidence, consensus, settlement, and recovery for Weft verifier daemon"
  name                      = local.dashboard_name
  title                     = local.dashboard_title
  version                   = "v5"
  uploaded_grafana          = false
  tags                      = ["weft", "agent", "hackathon", "signoz-agents"]
  layout                    = jsonencode(local.layout)
  panel_map                 = jsonencode({})
  variables                 = jsonencode({})

  lifecycle {
    # SigNoz API normalizes {} -> "" / null on read; ignore to avoid provider drift.
    ignore_changes = [variables, panel_map, version]
  }

  widgets = jsonencode([
    {
      id          = "agent-workflow"
      title       = "Agent Workflow Spans"
      description = "Plan, tool calls, LLM, evidence, verifier cycle"
      panelTypes  = "graph"
      yAxisUnit   = "short"
      query = {
        queryType = "builder"
        builder = {
          queryData = [{
            aggregateOperator = "count"
            dataSource        = "traces"
            queryName         = "A"
            expression        = "A"
            filters = {
              op    = "AND"
              items = [{
                key   = { key = "service.name", type = "resource" }
                op    = "="
                value = local.service_name
              }]
            }
            groupBy = [{ key = "name", type = "tag", isColumn = false }]
          }]
        }
      }
    },
    {
      id          = "llm-requests"
      title       = "LLM Requests"
      description = "Backend, model, and outcome for weft.llm.chat"
      panelTypes  = "graph"
      yAxisUnit   = "short"
      query = {
        queryType = "builder"
        builder = {
          queryData = [{
            aggregateOperator = "count"
            dataSource        = "traces"
            queryName         = "A"
            expression        = "A"
            filters = {
              op    = "AND"
              items = [
                { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                { key = { key = "name", type = "tag" }, op = "=", value = "weft.llm.chat" },
              ]
            }
            groupBy = [
              { key = "weft.llm.backend", type = "tag", isColumn = false },
              { key = "weft.llm.model", type = "tag", isColumn = false },
              { key = "weft.llm.outcome", type = "tag", isColumn = false },
            ]
          }]
        }
      }
    },
    {
      id          = "llm-cost"
      title       = "LLM Token Cost"
      description = "Total tokens and estimated USD cost"
      panelTypes  = "graph"
      yAxisUnit   = "none"
      query = {
        queryType = "builder"
        builder = {
          queryData = [
            {
              aggregateOperator = "sum"
              aggregateAttribute = { key = "gen_ai.usage.total_tokens", type = "tag" }
              dataSource        = "traces"
              queryName         = "A"
              expression        = "A"
              filters = {
                op    = "AND"
                items = [
                  { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                  { key = { key = "name", type = "tag" }, op = "=", value = "weft.llm.chat" },
                ]
              }
              groupBy = [{ key = "weft.llm.model", type = "tag", isColumn = false }]
            },
            {
              aggregateOperator = "sum"
              aggregateAttribute = { key = "weft.llm.cost_usd", type = "tag" }
              dataSource        = "traces"
              queryName         = "B"
              expression        = "B"
              filters = {
                op    = "AND"
                items = [
                  { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                  { key = { key = "name", type = "tag" }, op = "=", value = "weft.llm.chat" },
                ]
              }
              groupBy = [{ key = "weft.llm.model", type = "tag", isColumn = false }]
            },
          ]
        }
      }
    },
    {
      id          = "verification-outcomes"
      title       = "Verification Outcomes"
      description = "Verified, rejected, degraded, fallback"
      panelTypes  = "graph"
      yAxisUnit   = "short"
      query = {
        queryType = "builder"
        builder = {
          queryData = [{
            aggregateOperator = "count"
            dataSource        = "traces"
            queryName         = "A"
            expression        = "A"
            filters = {
              op    = "AND"
              items = [
                { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                { key = { key = "name", type = "tag" }, op = "=", value = "weft.verification_cycle" },
              ]
            }
            groupBy = [{ key = "weft.outcome", type = "tag", isColumn = false }]
          }]
        }
      }
    },
    {
      id          = "tool-calls"
      title       = "Tool Call Outcomes"
      description = "RPC and verifier tools by result"
      panelTypes  = "graph"
      yAxisUnit   = "short"
      query = {
        queryType = "builder"
        builder = {
          queryData = [{
            aggregateOperator = "count"
            dataSource        = "traces"
            queryName         = "A"
            expression        = "A"
            filters = {
              op    = "AND"
              items = [
                { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                { key = { key = "name", type = "tag" }, op = "=", value = "weft.agent.tool_call" },
              ]
            }
            groupBy = [
              { key = "weft.tool.name", type = "tag", isColumn = false },
              { key = "weft.tool.outcome", type = "tag", isColumn = false },
            ]
          }]
        }
      }
    },
    {
      id          = "peer-consensus"
      title       = "Peer Consensus Health"
      description = "Matching peers vs quorum threshold"
      panelTypes  = "graph"
      yAxisUnit   = "short"
      query = {
        queryType = "builder"
        builder = {
          queryData = [
            {
              aggregateOperator = "avg"
              aggregateAttribute = { key = "weft.matching_peers", type = "tag" }
              dataSource        = "traces"
              queryName         = "A"
              expression        = "A"
              filters = {
                op    = "AND"
                items = [
                  { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                  { key = { key = "name", type = "tag" }, op = "=", value = "weft.consensus.wait" },
                ]
              }
              groupBy = [{ key = "weft.milestone_hash", type = "tag", isColumn = false }]
            },
            {
              aggregateOperator = "max"
              aggregateAttribute = { key = "weft.peer_threshold", type = "tag" }
              dataSource        = "traces"
              queryName         = "B"
              expression        = "B"
              filters = {
                op    = "AND"
                items = [
                  { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                  { key = { key = "name", type = "tag" }, op = "=", value = "weft.consensus.wait" },
                ]
              }
              groupBy = [{ key = "weft.milestone_hash", type = "tag", isColumn = false }]
            },
          ]
        }
      }
    },
    {
      id          = "keeperhub"
      title       = "KeeperHub Reliability"
      description = "Confirmed vs fallback settlement"
      panelTypes  = "graph"
      yAxisUnit   = "short"
      query = {
        queryType = "builder"
        builder = {
          queryData = [{
            aggregateOperator = "count"
            dataSource        = "traces"
            queryName         = "A"
            expression        = "A"
            filters = {
              op    = "AND"
              items = [
                { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                { key = { key = "name", type = "tag" }, op = "=", value = "weft.keeperhub.release" },
              ]
            }
            groupBy = [{ key = "weft.keeperhub_status", type = "tag", isColumn = false }]
          }]
        }
      }
    },
    {
      id          = "recovery-events"
      title       = "Recovery Events"
      description = "Degraded paths and autonomous recovery"
      panelTypes  = "graph"
      yAxisUnit   = "short"
      query = {
        queryType = "builder"
        builder = {
          queryData = [{
            aggregateOperator = "count"
            dataSource        = "logs"
            queryName         = "A"
            expression        = "A"
            filters = {
              op    = "AND"
              items = [
                { key = { key = "service.name", type = "resource" }, op = "=", value = local.service_name },
                { key = { key = "body", type = "tag" }, op = "=", value = "weft.recovery" },
              ]
            }
            groupBy = [
              { key = "weft.recovery.event", type = "tag", isColumn = false },
              { key = "weft.recovery.outcome", type = "tag", isColumn = false },
            ]
          }]
        }
      }
    },
  ])
}
