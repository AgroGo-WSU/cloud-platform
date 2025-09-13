// Values that this module "returns" for use elsewhere - Drew
output "database_id" {
    value = cloudflare_d1_database.agrogo_db.id
}

output "database_name" {
    value = cloudflare_d1_database.agrogo_db.name
}