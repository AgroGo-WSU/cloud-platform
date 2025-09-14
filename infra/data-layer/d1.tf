// Template for provisioning a basic d1 database - Drew
resource "cloudflare_d1_database" "agrogo_db" {
    account_id = var.account_id
    name       = "tf-${var.name}"
}