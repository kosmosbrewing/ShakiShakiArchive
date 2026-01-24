# terraform/environments/prod/main.tf
# 메인 설정 파일
#
# 이 파일은 모든 리소스를 모듈화하지 않고 직접 정의하는 구조입니다.
# 각 리소스는 별도 파일에 정의되어 있습니다:
#
# - provider.tf      : AWS Provider 및 Terraform 버전 설정
# - backend.tf       : S3 원격 Backend 설정
# - data.tf          : 기존 리소스 참조 (VPC, ECS, CloudFront 등)
# - service-discovery.tf : Cloud Map 네임스페이스 및 서비스
# - vpc-link.tf      : API Gateway VPC Link
# - api-gateway.tf   : HTTP API, Integration, Route, Stage
# - cloudfront.tf    : CloudFront Origin 전환 가이드 (선택적)
# - variables.tf     : 변수 정의
# - outputs.tf       : 출력값 정의
#
# ============================================================================
# 적용 순서 (무중단 전환)
# ============================================================================
#
# Step 1: Backend 인프라 생성 (별도 디렉토리)
#   cd terraform/backend
#   terraform init
#   terraform apply
#
# Step 2: Service Discovery (Cloud Map) 생성
#   cd terraform/environments/prod
#   terraform init
#   terraform apply -target=aws_service_discovery_private_dns_namespace.main
#   terraform apply -target=aws_service_discovery_service.backend
#
# Step 3: ECS 서비스에 Service Registry 연결
#   AWS 콘솔 → ECS → 서비스 → 업데이트
#   Service Discovery 섹션에서 생성된 Cloud Map 서비스 선택
#
# Step 4: VPC Link 생성 (5~10분 소요)
#   terraform apply -target=aws_security_group.vpc_link
#   terraform apply -target=aws_security_group_rule.ecs_from_vpc_link
#   terraform apply -target=aws_apigatewayv2_vpc_link.main
#
# Step 5: API Gateway 생성
#   terraform apply -target=aws_apigatewayv2_api.main
#   terraform apply -target=aws_apigatewayv2_integration.backend
#   terraform apply -target=aws_apigatewayv2_route.root
#   terraform apply -target=aws_apigatewayv2_route.proxy
#   terraform apply -target=aws_cloudwatch_log_group.api_gateway
#   terraform apply -target=aws_apigatewayv2_stage.default
#
# Step 6: API Gateway 테스트
#   terraform output api_gateway_endpoint
#   curl https://xxxxxxxxxx.execute-api.ap-northeast-2.amazonaws.com/api/health
#
# Step 7: CloudFront Origin 전환 (AWS 콘솔에서 수동 권장)
#   terraform output api_gateway_domain
#   # 출력된 도메인을 CloudFront Origin으로 추가
#
# Step 8: 검증 완료 후 기존 ALB 삭제 (별도 작업)
#
# ============================================================================
# 전체 적용 (주의: 모든 리소스 한번에 생성)
# ============================================================================
#
# terraform init
# terraform plan
# terraform apply
#
# ============================================================================
# 롤백 계획
# ============================================================================
#
# 1. CloudFront Behaviors를 기존 ALB Origin으로 되돌리기
# 2. terraform destroy로 API Gateway 리소스 삭제
# 3. ALB 재활성화
