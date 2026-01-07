terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# The A Record for your app
resource "cloudflare_record" "audify_app" {
  zone_id = var.cloudflare_zone_id
  name    = "audify"
  content = var.hetzner_server_ip
  type    = "A"
  proxied = true # Orange Cloud ON (DDoS Protection + CDN)
  comment = "Managed by Terraform: Points to Hetzner VPS"
}
