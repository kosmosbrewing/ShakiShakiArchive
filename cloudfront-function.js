// cloudfront-function.js
// CloudFront Functions: URL을 prerendered HTML로 리다이렉트

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var normalizedUri = uri;

  // 트레일링 슬래시 정규화 (/faq/ -> /faq)
  if (normalizedUri.length > 1 && normalizedUri.endsWith('/')) {
    normalizedUri = normalizedUri.slice(0, -1);
  }

  // 이미 .html 확장자가 있으면 그대로 반환
  if (uri.endsWith('.html')) {
    return request;
  }

  // 빌드 asset과 public font는 그대로 반환
  if (uri.startsWith('/assets/') || uri.startsWith('/fonts/')) {
    return request;
  }

  // API 요청은 그대로 반환 (혹시 모를 경우 대비)
  if (uri.startsWith('/api/')) {
    return request;
  }

  // 정적 파일은 SPA fallback 없이 직접 반환한다.
  // Why: /fonts/*.woff2 같은 public asset이 index.html로 바뀌면 폰트가 전부 깨진다.
  if (uri.match(/\.(js|css|map|png|jpe?g|gif|svg|webp|avif|woff2?|ttf|otf|eot|txt|xml|ico|webmanifest|json)$/i)) {
    return request;
  }

  // 루트 경로
  if (uri === '/' || uri === '') {
    request.uri = '/index.html';
    return request;
  }

  // 상품 상세 페이지: /productDetail/123(/) -> /productDetail/123.html
  if (normalizedUri.match(/^\/productDetail\/[^/]+$/)) {
    request.uri = normalizedUri + '.html';
    return request;
  }

  // ALL은 API category가 아니라 프런트에서 합성하므로 prerender 파일이 없다.
  if (normalizedUri === '/product/all') {
    request.uri = '/index.html';
    return request;
  }

  // API에서 받은 실제 카테고리 페이지: /product/{slug} -> /product/{slug}.html
  if (normalizedUri.match(/^\/product\/[^/]+$/)) {
    request.uri = normalizedUri + '.html';
    return request;
  }

  // FAQ 페이지: /faq(/) -> /faq.html
  if (normalizedUri === '/faq') {
    request.uri = '/faq.html';
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
