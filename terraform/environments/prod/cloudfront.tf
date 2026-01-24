# terraform/environments/prod/cloudfront.tf
# CloudFront Origin 변경 관련 설정
#
# ⚠️ 중요: 기존 CloudFront 배포가 AWS 콘솔에서 수동 생성되었으므로,
# Terraform으로 관리하려면 먼저 import가 필요합니다.
#
# 권장 방법: AWS 콘솔에서 직접 Origin 교체 (안전한 롤백 가능)
#
# Terraform import 방법 (선택):
# terraform import aws_cloudfront_distribution.main EXXXXXXXXXX

# CloudFront에서 사용할 API Gateway 도메인 (로컬 변수)
locals {
  api_gateway_domain = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
}

# 아래 리소스는 CloudFront를 Terraform으로 관리할 경우에만 활성화하세요.
# 기존 수동 생성된 CloudFront를 사용 중이라면 주석 처리 상태로 두세요.

/*
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "ShakiShaki Distribution"
  default_root_object = ""
  price_class         = "PriceClass_200"  # 아시아/유럽/북미

  # API Gateway Origin (새로운 Origin)
  origin {
    domain_name = local.api_gateway_domain
    origin_id   = "api-gateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # 기본 캐시 동작 (API 요청)
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "api-gateway"

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Authorization", "Accept", "Content-Type"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  # 제한 설정 (필요시)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL 인증서 설정
  viewer_certificate {
    acm_certificate_arn            = var.acm_certificate_arn  # us-east-1에 있는 인증서
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  # 대체 도메인 (CNAME)
  aliases = var.cloudfront_aliases

  tags = {
    Name = "${var.project_name}-distribution"
  }
}
*/

# ============================================================================
# 수동 Origin 전환 가이드
# ============================================================================
#
# 1. AWS 콘솔 → CloudFront → 배포 선택
#
# 2. Origins 탭 → Create origin
#    - Origin domain: (아래 output에서 확인)
#    - Protocol: HTTPS only
#    - Name: api-gateway
#
# 3. Behaviors 탭 → Default (*) → Edit
#    - Origin and origin groups: api-gateway (새로 생성한 Origin 선택)
#    - Save changes
#
# 4. 배포가 완료되면 테스트
#    curl -v https://www.shakishaki.com/api/health
#
# 5. 문제 발생 시 Behaviors에서 Origin을 기존 ALB로 되돌리기
#
# 6. 캐시 무효화 (필요시)
#    aws cloudfront create-invalidation --distribution-id EXXXXXXXXXX --paths "/*"
# ============================================================================
