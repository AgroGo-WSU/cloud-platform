// Inputs needed to use this module - Drew
variable "account_id" {
    type        = string
    description = "The Cloudflare account ID used for managing resources in this module"
}

variable "name" {
    type        = string
    description = "The name of the database to be created or managed by this module"
}