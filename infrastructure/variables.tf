variable "cloudflare_api_token" {
  description = "API Token with DNS:Edit permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Zone ID for jrcodex.dev (Found in Cloudflare Dashboard)"
  type        = string
}

variable "hetzner_server_ip" {
  description = "IPv4 Address of your Hetzner VPS"
  type        = string
}
