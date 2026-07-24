variable "signoz_endpoint" {
  type        = string
  description = "SigNoz instance URL, e.g. https://modest-mosquito.us2.signoz.cloud"
  default     = "https://modest-mosquito.us2.signoz.cloud"
}

variable "signoz_access_token" {
  type        = string
  description = "SigNoz service-account API key (SIGNOZ_ACCESS_TOKEN). Never commit."
  sensitive   = true
}

variable "alert_channel" {
  type        = string
  description = "Notification channel name in SigNoz (created by provision script if missing)."
  default     = "weft-demo"
}
