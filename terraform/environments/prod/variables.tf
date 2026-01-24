# terraform/environments/prod/variables.tf
# 변수 정의

# ============================================================================
# 기본 설정
# ============================================================================

variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "aws_profile" {
  description = "AWS CLI 프로파일 이름"
  type        = string
  default     = "default"
}

variable "environment" {
  description = "환경 이름 (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "프로젝트 이름 (리소스 이름 접두사로 사용)"
  type        = string
  default     = "shakishaki"
}

# ============================================================================
# 기존 리소스 참조
# ============================================================================

variable "vpc_name" {
  description = "기존 VPC 이름 (태그 기준, vpc_id 미지정 시 사용)"
  type        = string
  default     = ""
}

variable "vpc_id" {
  description = "기존 VPC ID 직접 지정 (권장, Name 태그 없을 때 사용)"
  type        = string
  default     = ""
}

variable "private_subnet_tags" {
  description = "Private Subnet 조회용 태그 (예: {Type = \"private\"})"
  type        = map(string)
  default     = {}
}

variable "private_subnet_ids" {
  description = "Private Subnet ID 직접 지정 (태그 조회 대신 사용, 권장)"
  type        = list(string)
  default     = []
}

variable "ecs_cluster_name" {
  description = "기존 ECS 클러스터 이름"
  type        = string
}

variable "ecs_security_group_name" {
  description = "기존 ECS 태스크 Security Group 이름"
  type        = string
}

# ============================================================================
# ECS 설정
# ============================================================================

variable "ecs_container_port" {
  description = "ECS 컨테이너 포트"
  type        = number
  default     = 8080
}

# ============================================================================
# Service Discovery 설정
# ============================================================================

variable "service_discovery_namespace" {
  description = "Cloud Map 네임스페이스 도메인"
  type        = string
  default     = "shakishaki.local"
}

# ============================================================================
# API Gateway 설정
# ============================================================================

variable "cors_allowed_origins" {
  description = "CORS 허용 Origin 목록"
  type        = list(string)
  default     = ["https://shakishakiarchive.com", "https://www.shakishakiarchive.com"]
}

variable "log_retention_days" {
  description = "CloudWatch 로그 보존 기간 (일)"
  type        = number
  default     = 30
}

# ============================================================================
# 도메인 설정
# ============================================================================

variable "frontend_domain" {
  description = "프론트엔드 도메인 (쿠키 및 프록시 헤더용)"
  type        = string
  default     = "shakishakiarchive.com"
}

# ============================================================================
# CloudFront 설정 (Terraform으로 관리할 경우)
# ============================================================================

variable "cloudfront_aliases" {
  description = "CloudFront 대체 도메인 (CNAME)"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ACM 인증서 ARN (us-east-1 리전)"
  type        = string
  default     = ""
}
