#!/bin/bash
# CloudFront 캐시 무효화 스크립트

# CloudFront Distribution ID (실제 ID로 변경 필요)
DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"

echo "🗑️  CloudFront 캐시 무효화 중..."

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "✅ 캐시 무효화 요청 완료!"
echo "⏳ 5-10분 후 적용됩니다."
