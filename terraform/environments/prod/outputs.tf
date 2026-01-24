# terraform/environments/prod/outputs.tf
# 출력값 정의

# ============================================================================
# VPC Link
# ============================================================================

output "vpc_link_id" {
  description = "VPC Link ID"
  value       = aws_apigatewayv2_vpc_link.main.id
}

output "vpc_link_arn" {
  description = "VPC Link ARN"
  value       = aws_apigatewayv2_vpc_link.main.arn
}

# ============================================================================
# API Gateway
# ============================================================================

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.main.id
}

output "api_gateway_endpoint" {
  description = "API Gateway 호출 URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

output "api_gateway_domain" {
  description = "API Gateway 도메인 (CloudFront Origin 설정용)"
  value       = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
}

# ============================================================================
# Service Discovery (Cloud Map)
# ============================================================================

output "service_discovery_namespace_id" {
  description = "Cloud Map 네임스페이스 ID"
  value       = aws_service_discovery_private_dns_namespace.main.id
}

output "service_discovery_namespace_arn" {
  description = "Cloud Map 네임스페이스 ARN"
  value       = aws_service_discovery_private_dns_namespace.main.arn
}

output "service_discovery_namespace_hosted_zone" {
  description = "Cloud Map 네임스페이스 Hosted Zone ID"
  value       = aws_service_discovery_private_dns_namespace.main.hosted_zone
}

output "service_discovery_service_id" {
  description = "Cloud Map 서비스 ID"
  value       = aws_service_discovery_service.backend.id
}

output "service_discovery_service_arn" {
  description = "Cloud Map 서비스 ARN (ECS 서비스 등록 시 사용)"
  value       = aws_service_discovery_service.backend.arn
}

# ============================================================================
# Security Group
# ============================================================================

output "vpc_link_security_group_id" {
  description = "VPC Link Security Group ID"
  value       = aws_security_group.vpc_link.id
}

# ============================================================================
# 참조용 정보
# ============================================================================

output "vpc_id" {
  description = "참조된 VPC ID"
  value       = data.aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "사용된 Private Subnet ID 목록"
  value       = length(var.private_subnet_ids) > 0 ? var.private_subnet_ids : data.aws_subnets.private.ids
}

output "ecs_cluster_arn" {
  description = "참조된 ECS 클러스터 ARN"
  value       = data.aws_ecs_cluster.main.arn
}

# ============================================================================
# CloudFront Origin 설정 가이드
# ============================================================================

output "cloudfront_origin_config" {
  description = "CloudFront Origin 설정 정보"
  value = {
    origin_domain         = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
    origin_protocol       = "https-only"
    origin_ssl_protocols  = ["TLSv1.2"]
    recommended_origin_id = "api-gateway"
  }
}
