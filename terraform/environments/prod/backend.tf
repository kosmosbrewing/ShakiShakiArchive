# terraform/environments/prod/backend.tf
# S3 원격 Backend 설정

terraform {
  backend "s3" {
    bucket         = "shakishaki-terraform-state"
    key            = "prod/api-gateway/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "shakishaki-terraform-locks"
    encrypt        = true
  }
}
