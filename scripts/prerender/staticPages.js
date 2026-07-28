// scripts/prerender/staticPages.js
// 정적 정책 페이지(이용약관/개인정보) 메타데이터 — sitemap 전용
//
// Why: 과거에는 여기에 정책 본문 "요약본"을 두고 terms.html/privacy.html을 생성했다.
// 요약본은 권위 문서인 Vue 원문(src/pages/static/TermsOfService.vue,
// PrivacyPolicy.vue)과 내용이 달라, 생성된 .html이 직접 URL로 노출되면
// 법적 고지가 두 버전으로 갈리는 문제가 있었다(SEO_GEO_IMPROVEMENT_PLAN.md P0).
// 그래서 본문 생성을 제거하고, /terms·/privacy는 SPA fallback으로 Vue 원문만 제공한다.
// 여기에는 sitemap이 참조하는 lastmod 등 메타데이터만 남긴다.
//
// 주의: 이 파일에 본문을 다시 넣고 .html을 생성하지 말 것.
// 정책 single-source 설계가 끝나기 전에는 요약본을 배포 artifact로 만들지 않는다.

import { POLICY_LASTMOD } from "./config.js";

export const STATIC_POLICY_PAGES = {
  terms: {
    title: "이용약관",
    lastmod: POLICY_LASTMOD,
    description:
      "샤키샤키 아카이브의 서비스 이용, 주문, 결제, 배송, 환불 및 청약철회 기준을 안내합니다.",
  },
  privacy: {
    title: "개인정보 처리방침",
    lastmod: POLICY_LASTMOD,
    description:
      "샤키샤키 아카이브의 개인정보 수집, 이용, 보관, 제3자 제공 및 개인정보 보호책임자 정보를 안내합니다.",
  },
};
