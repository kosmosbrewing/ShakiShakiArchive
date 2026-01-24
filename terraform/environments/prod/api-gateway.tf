# terraform/environments/prod/api-gateway.tf
# API Gateway HTTP API 설정
# CloudFront → API Gateway → VPC Link → ECS 연결

# HTTP API (v2)
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  # CORS 설정
  cors_configuration {
    allow_origins     = var.cors_allowed_origins
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token", "Cookie"]
    expose_headers    = ["Set-Cookie"]
    allow_credentials = true
    max_age           = 300
  }

  tags = {
    Name = "${var.project_name}-api"
  }
}

# VPC Link Integration (Cloud Map Service Discovery 사용)
resource "aws_apigatewayv2_integration" "backend" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.main.id

  # Cloud Map Service Discovery URI (ARN + SRV 방식)
  # HTTP API v2 + VPC Link 사용 시 Cloud Map 서비스 ARN 사용
  # 단, Cloud Map 서비스는 반드시 SRV 레코드 타입이어야 함
  integration_uri = aws_service_discovery_service.backend.arn

  # 타임아웃 설정 (밀리초)
  timeout_milliseconds = 30000

  # 요청 헤더 전달 설정 (프록시 환경에서 쿠키/세션 정상 동작을 위함)
  # CloudFront → API Gateway → VPC Link 경유 시 필요한 헤더 전달
  # 참고: X-Forwarded-* 헤더와 Cookie는 AWS에서 직접 전달이 제한됨 - 커스텀 헤더 사용
  request_parameters = {
    # 원본 호스트 정보 (쿠키 도메인 검증용)
    "overwrite:header.X-Original-Host" = var.frontend_domain
    # HTTPS 프로토콜 정보 (req.secure 판단용, X-Forwarded-Proto 대체)
    "overwrite:header.X-Original-Proto" = "https"
    # Cookie 헤더를 커스텀 헤더로 전달 (백엔드에서 X-Original-Cookie를 Cookie로 복원)
    "overwrite:header.X-Original-Cookie" = "$request.header.Cookie"
  }
}

# 루트 경로 라우트 (/)
resource "aws_apigatewayv2_route" "root" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

# 프록시 라우트 (/{proxy+})
# 모든 하위 경로를 백엔드로 전달
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

# CloudWatch 로그 그룹
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/${var.project_name}-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-api-logs"
  }
}

# 스테이지 (자동 배포)
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  # 액세스 로그 설정
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
      errorMessage     = "$context.error.message"
      userAgent        = "$context.identity.userAgent"
    })
  }

  # 스테이지 변수 (필요시 사용)
  stage_variables = {
    environment = var.environment
  }

  tags = {
    Name = "${var.project_name}-api-default-stage"
  }
}

# HTTP API v2는 access_log_settings만 설정하면 CloudWatch 로그가 자동 활성화됨
# REST API (v1)와 달리 별도의 aws_api_gateway_account 설정 불필요
