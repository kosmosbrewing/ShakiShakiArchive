# terraform/environments/prod/service-discovery.tf
# AWS Cloud Map (Service Discovery) 설정
# ECS 서비스가 이 서비스에 등록되어 API Gateway가 찾을 수 있게 됨

# Private DNS Namespace
# VPC 내부에서만 접근 가능한 DNS 네임스페이스
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = var.service_discovery_namespace
  description = "ShakiShaki internal service discovery namespace"
  vpc         = data.aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-namespace"
  }
}

# Service Discovery Service
# ECS 서비스가 등록될 Cloud Map 서비스
# HTTP API v2 + VPC Link 사용 시 SRV 레코드 필수 (ARN 기반 통합)
resource "aws_service_discovery_service" "backend" {
  name = "backend"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    # SRV 레코드: 포트 정보 포함 (HTTP API v2 + VPC Link + Cloud Map ARN 연동에 필수)
    dns_records {
      ttl  = 10
      type = "SRV"
    }

    # MULTIVALUE: 여러 인스턴스가 있을 때 모두 반환 (로드밸런싱)
    routing_policy = "MULTIVALUE"
  }

  # ECS가 헬스체크를 관리하므로 custom config 사용
  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name = "${var.project_name}-backend-service"
  }
}

# 참고: ECS 서비스에 Service Registry 연결 (SRV 레코드 사용 시)
# AWS 콘솔에서 수동으로 또는 별도 Terraform 리소스로 처리
#
# [AWS 콘솔 설정 방법]
# ECS → Clusters → 클러스터 → Services → 서비스 → Update
# → Service discovery: Use Service discovery 체크
# → Namespace: shakishaki.local 선택
# → Service: backend 선택
# → Container name and port: 컨테이너명 + 포트(8080) 지정
# → Update
#
# [Terraform 예시]
# resource "aws_ecs_service" "backend" {
#   ...
#   service_registries {
#     registry_arn   = aws_service_discovery_service.backend.arn
#     container_name = "backend"
#     container_port = 8080
#   }
# }
