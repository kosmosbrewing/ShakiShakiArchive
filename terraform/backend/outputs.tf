# terraform/backend/outputs.tf
# Backend 리소스 출력값

output "s3_bucket_name" {
  description = "Terraform 상태 저장용 S3 버킷 이름"
  value       = aws_s3_bucket.terraform_state.id
}

output "s3_bucket_arn" {
  description = "Terraform 상태 저장용 S3 버킷 ARN"
  value       = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_table_name" {
  description = "Terraform 상태 잠금용 DynamoDB 테이블 이름"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "dynamodb_table_arn" {
  description = "Terraform 상태 잠금용 DynamoDB 테이블 ARN"
  value       = aws_dynamodb_table.terraform_locks.arn
}
