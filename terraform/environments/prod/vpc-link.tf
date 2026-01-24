# terraform/environments/prod/vpc-link.tf
# API Gateway VPC Link 설정
# Private Subnet의 ECS 서비스에 접근하기 위한 VPC Link

# VPC Link용 Security Group
# VPC Link는 아웃바운드로 ECS에 연결하므로 egress 규칙이 핵심
resource "aws_security_group" "vpc_link" {
  name        = "${var.project_name}-vpc-link-sg"
  description = "Security group for API Gateway VPC Link"
  vpc_id      = data.aws_vpc.main.id

  # ECS 컨테이너로의 아웃바운드 트래픽 허용
  egress {
    description = "Allow traffic to ECS container port"
    from_port   = var.ecs_container_port
    to_port     = var.ecs_container_port
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  # DNS 조회를 위한 아웃바운드 (Cloud Map) - UDP
  egress {
    description = "Allow DNS UDP for Cloud Map"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  # DNS 조회를 위한 아웃바운드 (Cloud Map) - TCP (큰 응답용)
  egress {
    description = "Allow DNS TCP for Cloud Map"
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  tags = {
    Name = "${var.project_name}-vpc-link-sg"
  }
}

# ECS Security Group에 VPC Link로부터의 인바운드 규칙 추가
# 기존 ECS SG가 이미 허용하고 있다면 생략 가능
resource "aws_security_group_rule" "ecs_from_vpc_link" {
  type                     = "ingress"
  from_port                = var.ecs_container_port
  to_port                  = var.ecs_container_port
  protocol                 = "tcp"
  security_group_id        = data.aws_security_group.ecs_tasks.id
  source_security_group_id = aws_security_group.vpc_link.id
  description              = "Allow traffic from VPC Link"
}

# API Gateway v2 VPC Link가 지원되는 AZ의 서브넷만 필터링
# ap-northeast-2d (apne2-az4)는 VPC Link 미지원
data "aws_subnets" "vpc_link_compatible" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "subnet-id"
    values = length(var.private_subnet_ids) > 0 ? var.private_subnet_ids : data.aws_subnets.private.ids
  }

  # 지원되는 가용 영역만 필터링 (apne2-az4 제외)
  filter {
    name   = "availability-zone"
    values = ["ap-northeast-2a", "ap-northeast-2b", "ap-northeast-2c"]
  }
}

# VPC Link (HTTP API v2용)
# 생성에 5~10분 소요될 수 있음
resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${var.project_name}-vpc-link"
  security_group_ids = [aws_security_group.vpc_link.id]

  # 지원되는 AZ의 서브넷만 사용
  subnet_ids = data.aws_subnets.vpc_link_compatible.ids

  tags = {
    Name = "${var.project_name}-vpc-link"
  }
}
