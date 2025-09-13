// Provide the Cloudflare plugin - Drew
terraform {
    required_providers {
        cloudflare = {
            source  = "cloudflare/cloudflare"
            version = "~> 5.0"
        }
    }
}

// Point Terraform to the Cloudflare plugin given above - Drew
provider "cloudflare" {
    api_token = var.d1_access_api_token
}

// Load the data-layer resources - Drew
module "data-layer" {
    source     = "./data-layer"
    account_id = var.account_id
    name       = "agrogo-db"

    providers = {
        cloudflare = cloudflare
    }
}