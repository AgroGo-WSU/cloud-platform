// Environment variables - Drew
variable "account_id" {
    description = "The Cloudflare account ID used for managing resources"
    type        = string
    sensitive   = true
}

variable "d1_access_api_token" {
    description = "The API token used to provision resources from D1"
    type        = string
    sensitive   = true
}