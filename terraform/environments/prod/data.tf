# terraform/environments/prod/data.tf
# 기존 AWS 리소스 참조 (콘솔에서 수동 생성된 리소스)

# 입력값 검증을 위한 로컬 변수
locals {
  # VPC 설정 검증
  vpc_config_valid = var.vpc_id != "" || var.vpc_name != ""

  # Subnet 설정 검증
  subnet_config_valid = length(var.private_subnet_ids) > 0 || length(var.private_subnet_tags) > 0
}

# 기존 VPC
# 방법 1: VPC ID 직접 지정 (권장 - Name 태그 없어도 됨)
# 방법 2: VPC Name 태그로 조회
data "aws_vpc" "main" {
  # vpc_id가 지정되면 ID로 조회, 아니면 Name 태그로 조회
  id = var.vpc_id != "" ? var.vpc_id : null

  dynamic "filter" {
    for_each = var.vpc_id == "" ? [1] : []
    content {
      name   = "tag:Name"
      values = [var.vpc_name]
    }
  }

  lifecycle {
    precondition {
      condition     = local.vpc_config_valid
      error_message = "vpc_id 또는 vpc_name 중 하나는 반드시 지정해야 합니다."
    }
  }
}

# Private Subnets (ECS가 있는 서브넷)
# 방법 1: 서브넷 ID를 직접 지정 (권장 - 가장 안정적)
# 방법 2: 태그 기반 필터링 (아래 코드)
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  # 태그 필터 (private_subnet_tags가 지정된 경우에만 유효)
  tags = var.private_subnet_tags

  lifecycle {
    precondition {
      condition     = local.subnet_config_valid
      error_message = "private_subnet_ids 또는 private_subnet_tags 중 하나는 반드시 지정해야 합니다."
    }
  }
}

# ECS 클러스터
data "aws_ecs_cluster" "main" {
  cluster_name = var.ecs_cluster_name
}

# 기존 Security Group (ECS 태스크용)
data "aws_security_group" "ecs_tasks" {
  name   = var.ecs_security_group_name
  vpc_id = data.aws_vpc.main.id
}
