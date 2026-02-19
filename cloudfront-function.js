// cloudfront-function.js
// CloudFront Functions: URL을 prerendered HTML로 리다이렉트

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // 이미 .html 확장자가 있으면 그대로 반환
  if (uri.endsWith('.html')) {
    return request;
  }

  // assets 폴더는 그대로 반환
  if (uri.startsWith('/assets/')) {
    return request;
  }

  // API 요청은 그대로 반환 (혹시 모를 경우 대비)
  if (uri.startsWith('/api/')) {
    return request;
  }

  // 정적 파일 확장자 (.txt, .xml, .ico 등)는 SPA fallback 없이 직접 반환
  // robots.txt, sitemap.xml이 index.html로 rewrite되는 것을 방지
  if (uri.match(/\.(txt|xml|ico|webmanifest|json)$/i)) {
    return request;
  }

  // 루트 경로
  if (uri === '/' || uri === '') {
    request.uri = '/index.html';
    return request;
  }

  // 상품 상세 페이지: /productDetail/123 -> /productDetail/123.html
  if (uri.match(/^\/productDetail\/[^/]+$/)) {
    request.uri = uri + '.html';
    return request;
  }

  // 상품 목록/카테고리 페이지: /product/all -> /product/all.html
  if (uri.match(/^\/product\/[^/]+$/)) {
    request.uri = uri + '.html';
    return request;
  }

  // 기타 모든 경로는 index.html로 (SPA fallback)
  request.uri = '/index.html';
  return request;
}

/*
CloudFront Functions 설정 가이드:

1. AWS Console → CloudFront → Functions
2. "Create function" 클릭
3. Function name: prerender-url-rewrite
4. 위 코드를 붙여넣기
5. "Save changes"
6. "Publish" 클릭
7. CloudFront Distribution → Behaviors → Edit
8. Function associations:
   - Viewer request: prerender-url-rewrite
9. "Save changes"
10. CloudFront 배포 대기 (5-10분)

테스트:
- https://your-domain.com/productDetail/123
  → /productDetail/123.html 파일 서빙
- 개발자 도구에서 메타 태그 확인
*/
