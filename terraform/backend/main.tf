# terraform/backend/main.tf
# Terraform 상태 관리를 위한 S3 버킷 및 DynamoDB 테이블 생성
# 이 파일은 다른 Terraform 설정보다 먼저 적용해야 합니다.

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"
}

# S3 버킷 (Terraform 상태 저장)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "shakishaki-terraform-state"

  # 실수로 삭제되는 것을 방지
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "shakishaki-terraform-state"
    Environment = "shared"
    ManagedBy   = "terraform"
  }
}

# S3 버킷 버전 관리 활성화 (상태 이력 추적)
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 버킷 서버 측 암호화 설정
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 버킷 퍼블릭 액세스 차단
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB 테이블 (Terraform 상태 잠금)
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "shakishaki-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "shakishaki-terraform-locks"
    Environment = "shared"
    ManagedBy   = "terraform"
  }
}
