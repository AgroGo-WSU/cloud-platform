// Since cloudflare doesn't have a "hashicorp/*" provider, this is needed in every module - Drew
terraform {
    required_providers {
        cloudflare = {
            source  = "cloudflare/cloudflare"
            version = "~> 5.0"
        }
    }
}