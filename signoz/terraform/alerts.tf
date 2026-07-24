locals {
  threshold_channels = [var.alert_channel]

  alert_threshold = {
    basic = {
      kind = "basic"
      spec = [{
        name       = "critical"
        op         = "above"
        match_type = "at_least_once"
        target     = 0
        channels   = local.threshold_channels
      }]
    }
  }

  alert_evaluation = {
    rolling = {
      kind = "rolling"
      spec = {
        eval_window = "5m"
        frequency   = "1m"
      }
    }
  }
}

resource "signoz_rule" "keeperhub_fallback" {
  alert          = "Weft KeeperHub fallback activated"
  alert_type     = "TRACES_BASED_ALERT"
  rule_type      = "threshold_rule"
  schema_version = "v2alpha1"
  description    = "KeeperHub settlement fell back to direct cast execution for weft-daemon."

  annotations = {
    summary     = "KeeperHub fallback detected"
    description = "KeeperHub settlement fell back to cast for weft-daemon."
  }

  condition = {
    composite_query = {
      panel_type = "graph"
      query_type = "builder"
      queries = [{
        builder_query = {
          type = "builder_query"
          spec = {
            traces = {
              signal        = "traces"
              name          = "A"
              step_interval = "60"
              filter = {
                expression = "service.name = 'weft-daemon' AND name = 'weft.keeperhub.release' AND weft.keeperhub_status = 'fallback'"
              }
              aggregations = [{ expression = "count()" }]
            }
          }
        }
      }]
    }
    selected_query_name = "A"
    thresholds          = local.alert_threshold
  }

  evaluation            = local.alert_evaluation
  notification_settings = {}
  labels = {
    team  = "weft"
    track = "signoz-hackathon"
  }
}

resource "signoz_rule" "peer_quorum_degraded" {
  alert          = "Weft peer quorum degraded"
  alert_type     = "LOGS_BASED_ALERT"
  rule_type      = "threshold_rule"
  schema_version = "v2alpha1"
  description    = "Verifier swarm did not reach peer quorum before voting."

  annotations = {
    summary     = "Consensus degraded for weft-daemon"
    description = "Peer quorum degraded before verifier vote."
  }

  condition = {
    composite_query = {
      panel_type = "graph"
      query_type = "builder"
      queries = [{
        builder_query = {
          type = "builder_query"
          spec = {
            logs = {
              signal        = "logs"
              name          = "A"
              step_interval = "60"
              filter = {
                expression = "service.name = 'weft-daemon' AND weft.recovery.event = 'consensus_degraded'"
              }
              aggregations = [{ expression = "count()" }]
            }
          }
        }
      }]
    }
    selected_query_name = "A"
    thresholds          = local.alert_threshold
  }

  evaluation            = local.alert_evaluation
  notification_settings = {}
  labels = {
    team  = "weft"
    track = "signoz-hackathon"
  }
}

resource "signoz_rule" "llm_narrative_failures" {
  alert          = "Weft LLM narrative failures"
  alert_type     = "TRACES_BASED_ALERT"
  rule_type      = "threshold_rule"
  schema_version = "v2alpha1"
  description    = "Narrative LLM span failed during verifier cycle."

  annotations = {
    summary     = "LLM narrative error on weft-daemon"
    description = "weft.llm.chat span failed during verifier cycle."
  }

  condition = {
    composite_query = {
      panel_type = "graph"
      query_type = "builder"
      queries = [{
        builder_query = {
          type = "builder_query"
          spec = {
            traces = {
              signal        = "traces"
              name          = "A"
              step_interval = "60"
              filter = {
                expression = "service.name = 'weft-daemon' AND name = 'weft.llm.chat' AND weft.llm.outcome = 'error'"
              }
              aggregations = [{ expression = "count()" }]
            }
          }
        }
      }]
    }
    selected_query_name = "A"
    thresholds          = local.alert_threshold
  }

  evaluation            = local.alert_evaluation
  notification_settings = {}
  labels = {
    team  = "weft"
    track = "signoz-hackathon"
  }
}
